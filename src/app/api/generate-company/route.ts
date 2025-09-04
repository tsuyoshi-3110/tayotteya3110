// app/api/ai/generate-company/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Body = {
  target: "about" | "business";
  keywords?: string[];
  temperature?: number;
  seed?: number | string;

  // ★ 追加: 文脈（全部 任意）
  companyName?: string;
  tagline?: string;
  location?: string;         // 例: "東京都台東区"
  audience?: string;         // 例: "中小小売 / 個人事業主"
  industryHint?: string;     // 例: "美容 / 建設 / SaaS / NPO ..."
  existingAbout?: string;    // 既存の会社説明（あれば矛盾しないように）
  existingBusiness?: string[]; // 既存の事業内容
};

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// 生成の安定 & バリエーション用スタイル
const STYLES = [
  "落ち着いた丁寧語で、実務的に",
  "端的でビジネスライク、宣伝過多を避ける",
  "温かく親しみやすいが、誇張表現なし",
  "短文でテンポよく、箇条書き寄りの記述を避ける",
  "専門用語は必要最小限にし、一般向けに噛み砕く",
];

// ------ ユーティリティ（後処理） ------
function uniqKeepOrder(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const k = v.trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

// 事業内容の整形: 箇条書き/番号/句点を除去し、長さを整える
function normalizeBusinessLines(lines: string[]): string[] {
  const cleaned = lines
    .map((s) =>
      String(s)
        .replace(/^\s*[-*・●\d①-⑳\(\)（）.]+\s*/g, "") // プレフィックス除去
        .replace(/[。．]+$/g, "") // 末尾句点を軽く除去
        .trim()
    )
    .filter(Boolean);

  // 過剰な長さはカット（20〜36字程度を目安に）
  const limited = cleaned.map((s) =>
    s.length > 40 ? s.slice(0, 38).replace(/\s+\S*$/, "") : s
  );

  return uniqKeepOrder(limited).slice(0, 8);
}

function buildSystem(target: "about" | "business") {
  return [
    "あなたは日本語のB2B/B2Cライティングアシスタントです。",
    "不確実な固有名詞を断定しないでください（“可能性がある”など曖昧表現を使用）。",
    "誇大広告や医療・法律などの断定的表現を避け、事実ベースで簡潔に説明します。",
    "出力は必ずJSONオブジェクト**のみ**にしてください。装飾テキストは不要です。",
    target === "about"
      ? `出力形式: {"about": string}`
      : `出力形式: {"business": string[]}`,
  ].join("\n");
}

function buildFewShot(target: "about" | "business") {
  if (target === "about") {
    return [
      { role: "user", content: "業種: 建設 / 住宅\n条件: 誇張しない・地域密着・運用まで支援\n出力形式: {\"about\": string}" },
      { role: "assistant", content: JSON.stringify({ about: "私たちは住宅リフォームを中心に、現場の課題把握から施工後のメンテナンスまで一貫して支援します。過度な約束はせず、工程の見える化と小回りの利く対応で、安心して任せられる体制を整えています。地域のネットワークを活かし、生活動線や安全面にも配慮した提案を心掛けています。" }) },

      { role: "user", content: "業種: 美容 / サロン\n条件: 誇張しない・小規模事業主向け・予約導線の整備\n出力形式: {\"about\": string}" },
      { role: "assistant", content: JSON.stringify({ about: "個人サロンの運営を、集客設計から予約導線の整備、リピーターづくりまで伴走します。写真や文章の表現は“伝わりやすさ”を優先し、無理のない更新運用を重視。小さな改善を重ねることで、来店体験と売上の安定化を支えます。" }) },

      { role: "user", content: "業種: SaaS\n条件: 誇張しない・中小企業向け・導入後支援まで\n出力形式: {\"about\": string}" },
      { role: "assistant", content: JSON.stringify({ about: "中小企業の業務をSaaSでシンプルに。現場フローの把握から要件整理、段階的な導入、運用定着までを小さく素早く回します。専門用語を避け、誰でも使えることを重視。サポートはチャットとオンライン面談で継続的に行います。" }) },
    ] as const;
  }

  // business
  return [
    { role: "user", content: "業種: 建設 / 住宅\n出力: {\"business\": string[]}" },
    { role: "assistant", content: JSON.stringify({ business: ["内装・外装リフォーム", "耐震・断熱改修の提案", "施工後メンテナンス支援", "見積・工程の可視化支援"] }) },

    { role: "user", content: "業種: 美容 / サロン\n出力: {\"business\": string[]}" },
    { role: "assistant", content: JSON.stringify({ business: ["予約導線の設計・最適化", "メニュー撮影・掲載支援", "SNS・クチコミ運用補助", "再来店促進の仕組みづくり"] }) },

    { role: "user", content: "業種: SaaS\n出力: {\"business\": string[]}" },
    { role: "assistant", content: JSON.stringify({ business: ["要件整理とPoC実施", "導入支援・データ移行", "利用定着のトレーニング", "運用・改善の継続支援"] }) },
  ] as const;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const {
      target,
      keywords = [],
      temperature = 0.85,
      seed,
      companyName,
      tagline,
      location,
      audience,
      industryHint,
      existingAbout,
      existingBusiness,
    } = body;

    if (!target || !["about", "business"].includes(target)) {
      return Response.json({ error: "target must be 'about' or 'business'." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const kws = keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 3);
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    const variationSeed = (seed ?? Math.random().toString(36).slice(2)).toString();

    const contextLines = [
      companyName ? `会社名: ${companyName}` : "",
      tagline ? `タグライン: ${tagline}` : "",
      location ? `所在地: ${location}` : "",
      audience ? `想定顧客: ${audience}` : "",
      industryHint ? `業種ヒント: ${industryHint}` : "",
      kws.length ? `キーワード: ${kws.join(" / ")}` : "",
      existingAbout ? `既存About（矛盾しない程度で反映）:\n${existingAbout}` : "",
      Array.isArray(existingBusiness) && existingBusiness.length
        ? `既存Business（重複を避けつつ洗練）:\n- ${existingBusiness.join("\n- ")}`
        : "",
      `文体スタイル: ${style}`,
      `variation_seed: ${variationSeed}`,
    ]
      .filter(Boolean)
      .join("\n");

    // few-shot
    const shots = buildFewShot(target);

    // メインプロンプト
    const userPrompt =
      target === "about"
        ? [
            "要件:",
            "- 180〜320字程度で、読みやすさ優先（です・ます調）。",
            "- 誇大・断定・根拠のない比較を避ける。",
            "- 何を支援/提供し、どの姿勢で臨むかを簡潔に。",
            "- 不確実な固有名詞（受賞歴・取引社名など）は出さない。",
            "- 広告コピーではなく、“中立的な会社説明文”。",
            "",
            "コンテキスト:",
            contextLines,
            "",
            '出力形式: {"about": string}',
          ].join("\n")
        : [
            "要件:",
            "- 3〜6項目の配列。各項目は20〜40字程度、名詞止め中心。",
            "- 重複・冗長・同義反復を避ける（後処理でも整形します）。",
            "- 不確実な固有名詞は入れない。",
            "",
            "コンテキスト:",
            contextLines,
            "",
            '出力形式: {"business": string[]}',
          ].join("\n");

    // リトライ（最大2回）
    let raw = "";
    let lastErr: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          temperature: Math.min(Math.max(temperature, 0), 1),
          top_p: 0.9,
          presence_penalty: 0.7,
          frequency_penalty: 0.25,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystem(target) },
            ...shots,
            { role: "user", content: userPrompt },
          ],
        });
        raw = completion.choices[0]?.message?.content ?? "";
        if (raw) break;
      } catch (err) {
        lastErr = err;
        // 次の試行でスタイルだけ入れ替えて再挑戦
      }
    }
    if (!raw) {
      throw lastErr ?? new Error("No response from model");
    }

    // JSONパースと後処理
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      json =
        target === "about"
          ? {
              about:
                "私たちはお客様の現場に寄り添い、要件整理から実装・運用までを段階的に支援します。誇張表現を避け、使い続けられる仕組みづくりを重視。小さな改善を積み重ね、成果の再現性を高めます。",
            }
          : {
              business: [
                "要件整理と計画立案の支援",
                "導入・実装の伴走",
                "運用・改善サイクルの設計",
                "継続的なサポート体制",
              ],
            };
    }

    if (target === "about") {
      const about =
        typeof json.about === "string" && json.about.trim()
          ? json.about.trim()
          : "現場理解を起点に、実装と運用まで一貫支援。無理のない導入と継続改善で、成果の安定化に取り組みます。";
      // 軽い整形：全角/半角の混在を許容、過剰な空白を1つに
      return Response.json({ about: about.replace(/\s{2,}/g, " ") });
    } else {
      const arr = Array.isArray(json.business) ? json.business : [];
      const business = normalizeBusinessLines(arr);
      return Response.json({
        business: business.length
          ? business
          : ["要件整理と計画立案の支援", "導入・実装の伴走", "運用・改善サイクルの設計"],
      });
    }
  } catch (e: any) {
    console.error(e);
    return Response.json(
      { error: "Generation failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
