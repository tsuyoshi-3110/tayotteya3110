// app/api/blog/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { title, keywords } = (await req.json()) as {
      title?: string;
      keywords?: string[];
    };

    // 入力バリデーション
    const t = (title ?? "").trim();
    const ks = Array.isArray(keywords)
      ? keywords
          .map((k) => (k ?? "").trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];

    if (!t) {
      return NextResponse.json(
        { error: "タイトルを入力してください。" },
        { status: 400 }
      );
    }
    if (ks.length === 0) {
      return NextResponse.json(
        { error: "キーワードを1つ以上入力してください。" },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // プロンプト（日本語で、ブログ向け・200〜500語目安）
    const system =
      "あなたは日本語で文章を作るプロのブログ編集者です。読みやすく、自然で、重複の少ない本文を生成します。";

    const user = [
      `個人のブログ記事として本文を書いてください。`,
      `タイトル: ${t}`,
      `キーワード(最大3): ${ks.join(", ")}`,
      `要件:`,
      `- 一人称（私／僕）で書く`,
      `- 雑誌記事やニュース記事のような説明調ではなく、体験談をそのまま語る口語的な文体`,
      `- 読者に語りかけるように（「釣り好きならぜひ！」など）`,
      `- 感情的な表現や日常的な言葉を適度に混ぜる（例：ワクワクした、テンション上がった、思わず笑った）`,
      `- 段落で構成するが、Markdownの見出し記号（# や ### など）は使わない`,
      `- 絵文字は使わない`,
      `- 全体で200〜500語程度`,
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // 手元の安価・高品質モデル例。必要に応じて変更可
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "本文の生成に失敗しました。" },
        { status: 500 }
      );
    }

    return NextResponse.json({ body: content });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "エラーが発生しました。" },
      { status: 500 }
    );
  }
}
