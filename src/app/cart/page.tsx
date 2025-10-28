// /src/app/api/ai-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** Firestore {items: [{question, answer}, ...]} を読むヘルパ */
async function getItems(ref: FirebaseFirestore.DocumentReference) {
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() as any) : null;
  return (data?.items ?? []) as { question?: string; answer?: string }[];
}

/** Q/A配列 → System注入用テキスト */
function qaToText(
  label: string,
  qa: { question?: string; answer?: string }[],
  limit = 20
) {
  const body = qa
    .slice(0, limit)
    .map((x) => {
      const q = (x.question ?? "").trim().replace(/\s+/g, " ").slice(0, 400);
      const a = (x.answer ?? "").trim().replace(/\s+/g, " ").slice(0, 600);
      return `Q: ${q}\nA: ${a}`;
    })
    .join("\n---\n");
  return body ? `【${label}】\n${body}` : "";
}

/** menuSections から料金・メニューを抽出し、System用テキストに整形 */
async function getMenuKnowledgeFromFirestore(siteKey: string) {
  const secSnap = await adminDb
    .collection("menuSections")
    .where("siteKey", "==", siteKey)
    .orderBy("order", "asc")
    .get();

  const blocks: string[] = [];

  for (const d of secSnap.docs) {
    const s = d.data() as any;
    const sectionTitle: string = s?.titleI18n?.ja || s?.title || "";
    if (!sectionTitle) { continue; } // ← if を付ける

    const lines: string[] = []; // ← 再代入しないので const
    try {
      const itemsSnap = await d.ref.collection("items").orderBy("order", "asc").get();
      itemsSnap.forEach((itDoc) => {
        const it = itDoc.data() as any;
        const name = it?.titleI18n?.ja || it?.title || "";
        const price =
          it?.priceText ??
          (typeof it?.price === "number" ? `¥${it.price.toLocaleString()}` : (it?.price ?? ""));
        const dur =
          it?.durationText ??
          (it?.durationMin ? `${it.durationMin}分` : "");
        const note = (it?.shortDesc ?? it?.description ?? "").toString();

        const line = [
          name && `- ${name}`,
          price && `：${price}`,
          dur && `／目安${dur}`,
          note && `／${note.slice(0, 50)}`
        ].filter(Boolean).join("");

        if (line) lines.push(line);
      });
    } catch {
      // items が無い・権限・インデックス未作成はスキップ
    }

    if (lines.length > 0) {
      blocks.push(`■ ${sectionTitle}\n${lines.join("\n")}`);
    }
  }

  const capped = blocks.join("\n").split("\n").slice(0, 120).join("\n"); // トークン抑制
  return capped ? `【メニュー・料金（自動抽出）】\n${capped}` : "";
}


export async function POST(req: NextRequest) {
  try {
    const { message, siteKey } = await req.json();

    if (!message || !siteKey) {
      return NextResponse.json(
        { error: "message and siteKey are required" },
        { status: 400 }
      );
    }

    // 1) ナレッジ取得（base / owner / learned）
    const baseDoc = adminDb.collection("aiKnowledge").doc("base");
    const ownerDoc = adminDb
      .collection("aiKnowledge")
      .doc(siteKey)
      .collection("docs")
      .doc("owner");
    const learnDoc = adminDb
      .collection("aiKnowledge")
      .doc(siteKey)
      .collection("docs")
      .doc("learned");

    const [baseItems, ownerItems, learnedItems] = await Promise.all([
      getItems(baseDoc),
      getItems(ownerDoc),
      getItems(learnDoc),
    ]);

    const staticKnowledge = [
      qaToText("共通知識", baseItems, 30),
      qaToText("店舗固有知識", ownerItems, 40),
      qaToText("学習知識", learnedItems, 60),
    ]
      .filter(Boolean)
      .join("\n\n");

    // 2) 料金・メニューを動的抽出
    const menuText = await getMenuKnowledgeFromFirestore(siteKey);

    // 3) すべてのナレッジを結合
    const allKnowledge = [staticKnowledge, menuText].filter(Boolean).join("\n\n");

    // 4) メッセージを「明示型」で構築
    type ChatMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
    const messages: ChatMsg[] = [];

    // ── メタデータ由来のベースプロンプト（物販話題を抑制） ──
    const systemPolicy = `
あなたは「おそうじ処 たよって屋」（https://tayotteya.shop）専属の **ハウスクリーニング／家事代行サポートAI** です。対象は **大阪・兵庫**（例：大阪市東淀川区／豊中市／吹田市 など）のお客様。**水回り・リビング・定期清掃**、**エアコンクリーニング**、**整理収納**の案内を主とします。サイトID: ${siteKey}。

【対応範囲】
- サービス内容の説明（ハウスクリーニング／エアコンクリーニング／家事代行／整理収納）
- 見積もり・予約方法・対応エリア・料金の目安・所要時間・注意事項・問い合わせ導線

【禁止・制約】
- “購入／販売／在庫／注文” 等の**物販の話題は自ら出さない**。ユーザーが明確に購入希望を示し、且つショップ機能が有効な場合のみ**最小限**の案内にとどめる。
- 危険な分解や薬剤使用の詳細手順を指示しない。自己作業は**安全注意と範囲の限定**を添える。
- 価格の最終確定、日程確定、対応可否など**確証が必要な事項**や**情報不足**のときは推測せず、必ず **「担当者に確認します」** と明記して終了する。

【返答スタイル】
- 口調は丁寧・簡潔（です・ます）。**1〜3段落＋必要に応じて箇条書き**。
- 専門用語は短く補足（例：**養生＝汚れ防止の保護**）。
- 「クーラー／エアコン」等の曖昧語は**最初に1問だけ**意図確認してから具体回答。
${allKnowledge ? "以下の参照知識を活用して正確に回答してください。" : ""}
`.trim();

    messages.push({ role: "system", content: systemPolicy });
    if (allKnowledge) messages.push({ role: "system", content: allKnowledge });
    messages.push({ role: "user", content: String(message) });

    // 5) OpenAI 呼び出し
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ??
      "すみません、うまく回答できませんでした。";

    // 6) ログ保存
    await adminDb.collection("aiChatLogs").add({
      siteKey,
      message,
      answer,
      createdAt: new Date(),
    });

    // 7) 回答不能っぽいなら通知
    const needsHuman =
      /担当.?者に確認します|分かりません|確認の上ご案内/i.test(answer);
    if (needsHuman) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ai-notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteKey, question: message }),
        });
      } catch (e) {
        console.error("AI notify error:", e);
      }
    }

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("AI chat error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
