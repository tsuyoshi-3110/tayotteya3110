// app/faq/page.tsx
import type { Metadata } from "next";
import { buildFAQJsonLd, type FaqItem } from "@/lib/jsonld/faq";

export const metadata: Metadata = {
  title: "よくある質問（FAQ）｜おそうじ処 たよって屋",
  description:
    "料金・対応エリア・キャンセル・支払い方法など、たよって屋のハウスクリーニング／家事代行に関するよくある質問。",
  alternates: { canonical: "https://tayotteya.shop/faq" },
  openGraph: {
    title: "よくある質問（FAQ）｜おそうじ処 たよって屋",
    description:
      "料金・対応エリア・キャンセル・支払い方法など、よくある質問を分かりやすく掲載しています。",
    url: "https://tayotteya.shop/faq",
    siteName: "おそうじ処 たよって屋",
    images: [{ url: "/ogpLogo.png", width: 1200, height: 630 }],
    locale: "ja_JP",
    type: "article",
  },
};

const FAQS: FaqItem[] = [
  {
    question: "対応エリアはどこですか？",
    answer:
      "大阪府・兵庫県を中心に対応しています。豊中市・吹田市・東淀川区・池田市・箕面市・尼崎市など、まずはお気軽にご相談ください。",
  },
  {
    question: "見積もりは無料ですか？",
    answer:
      "はい、無料です。現地確認が必要な場合もありますが、費用はいただきません。",
  },
  {
    question: "支払い方法は？",
    answer:
      "現金・銀行振込・各種キャッシュレス（ご相談ください）に対応しています。",
  },
  {
    question: "当日の追加依頼や延長は可能ですか？",
    answer:
      "当日のスケジュール次第ですが、可能な限り柔軟に対応いたします。スタッフへご相談ください。",
  },
  {
    question: "キャンセル料はかかりますか？",
    answer:
      "前日キャンセルは無料、当日キャンセルは作業代の50％を頂戴しております（事前連絡なしの不在は100％）。",
  },
];

export default function FAQPage() {
  const jsonLd = buildFAQJsonLd(FAQS);
  const safe = (o: object) => JSON.stringify(o).replace(/</g, "\\u003c");

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safe(jsonLd) }} />

      <h1 className="text-3xl font-extrabold mb-6">よくある質問（FAQ）</h1>
      <dl className="space-y-6">
        {FAQS.map((f, i) => (
          <div key={i} className="bg-white/40 rounded-2xl p-4 shadow">
            <dt className="font-bold mb-2">Q. {f.question}</dt>
            <dd className="leading-relaxed">A. {f.answer}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
