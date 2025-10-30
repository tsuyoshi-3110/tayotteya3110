// app/areas/local/page.tsx
import { Link } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "東淀川区の家事代行・ハウスクリーニング｜おそうじ処 たよって屋",
  description:
    "大阪市東淀川区の家事代行・ハウスクリーニングは「おそうじ処 たよって屋」へ。水回り（キッチン・浴室・トイレ）からリビング定期清掃、整理収納まで、丁寧で安心のサービス。",
  alternates: { canonical: "https://tayotteya.shop/areas/higashiyodogawa" },
  openGraph: {
    title: "東淀川区の家事代行・ハウスクリーニング｜おそうじ処 たよって屋",
    description:
      "東淀川区（淡路・上新庄・だいどう豊里 ほか）で家事代行・ハウスクリーニング。定期/スポット対応、女性スタッフ指名OK。",
    url: "https://tayotteya.shop/areas/higashiyodogawa",
    type: "article",
    images: [
      { url: "https://tayotteya.shop/ogpLogo.png", width: 1200, height: 630 },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">
          東淀川区の家事代行・ハウスクリーニング
        </h1>
        <p className="text-sm text-muted-foreground">
          淡路・上新庄・だいどう豊里・井高野・柴島など東淀川区全域に対応。
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border bg-white/70 p-5">
          <h2 className="font-semibold mb-2">家事代行（単発／定期）</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>掃除・片付け・洗濯・買い物代行</li>
            <li>お子様／高齢者の見守り（家事の範囲内）</li>
            <li>女性スタッフ指名可</li>
          </ul>
        </article>
        <article className="rounded-xl border bg-white/70 p-5">
          <h2 className="font-semibold mb-2">ハウスクリーニング</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>水回り（キッチン・浴室・洗面・トイレ）</li>
            <li>エアコンクリーニング</li>
            <li>引越し前後・空室クリーニング</li>
          </ul>
        </article>
      </section>

      <section className="rounded-xl border bg-white/70 p-5">
        <h2 className="font-semibold mb-2">対応エリア（東淀川区）</h2>
        <p className="text-sm">
          淡路・東淡路・菅原・豊新・上新庄・瑞光・小松・南江口・北江口・井高野・大桐・大隅・豊里・大道南・柴島・下新庄
          ほか
        </p>
      </section>

      <section className="rounded-xl border bg-white/70 p-5">
        <h2 className="font-semibold mb-2">よくある質問</h2>
        <details className="mb-2">
          <summary className="cursor-pointer font-medium">
            当日のお願いは可能ですか？
          </summary>
          <p className="text-sm mt-2">
            スケジュールに空きがあれば対応いたします。まずはお問い合わせください。
          </p>
        </details>
        <details>
          <summary className="cursor-pointer font-medium">
            鍵預かりや在宅不要の対応は？
          </summary>
          <p className="text-sm mt-2">
            条件を確認のうえ、適切に管理して対応可能です。
          </p>
        </details>
      </section>

      <section className="rounded-xl border bg-white/70 p-5">
        <h2 className="font-semibold mb-2">お問い合わせ</h2>
        <p className="text-sm">
          予約状況の確認・見積りは、LINE／メールフォームからお気軽にどうぞ。
        </p>
      </section>

      {/* 内部リンクで「地域→メニュー」回遊を作る */}
      <nav className="text-sm underline">
        <Link href="/">サービス一覧へ</Link>
      </nav>

      {/* FAQ構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "東淀川区で当日予約は可能ですか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "当日の空き状況によっては対応可能です。まずはお問い合わせください。",
                },
              },
              {
                "@type": "Question",
                name: "鍵預かりでの不在クリーニングは対応していますか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "条件を確認のうえ、鍵管理のルールに基づいて対応します。詳細は事前にご相談ください。",
                },
              },
            ],
          }),
        }}
      />
    </main>
  );
}
