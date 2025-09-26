// src/app/(routes)/home/page.tsx

import type { Metadata } from "next";
import BackgroundVideo from "@/components/backgroundVideo/BackgroundVideo";
import TopFixedText from "@/components/TopFixedText";
import ScrollUpCTA from "@/components/ScrollUpCTA";

export const metadata: Metadata = {
  title: "株式会社 TS Reform｜外装リフォーム・建設工事",
  description:
    "株式会社 TS Reform は大阪府豊中市の外装リフォーム・建設工事の専門会社。外壁塗装・屋根改修・防水工事・雨漏り調査まで一貫対応。まずは無料見積もりをご相談ください。（TEL: 06-6151-3328）",
  openGraph: {
    title: "株式会社 TS Reform｜外装リフォーム・建設工事",
    description:
      "豊中市を拠点に外壁・屋根・防水などの外装リフォーム全般をワンストップで対応。確かな施工で住まいを長く美しく守ります。",
    url: "https://ts-reform.jp/",
    siteName: "株式会社 TS Reform",
    images: [
      {
        url: "https://ts-reform.jp/ogpLogo.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  alternates: { canonical: "https://ts-reform.jp/" },
};

export default function HomePage() {
  return (
    <main className="w-full overflow-x-hidden">
      {/* ① ファーストビュー：背景動画または画像 */}
      <section className="relative h-screen overflow-hidden">
        <BackgroundVideo />
      </section>

      {/* ② テキスト紹介セクション */}
      <section className="relative z-10 text-white px-4 py-20">
        {/* 編集可能な固定テキストコンポーネント */}
        <TopFixedText />

        {/* ページタイトルとリード文 */}
        <h1 className="text-3xl lg:text-4xl font-extrabold text-center leading-tight mb-6 text-outline">
          株式会社 TS Reform
        </h1>

        <p className="max-w-3xl mx-auto text-center leading-relaxed text-outline">
          大阪府豊中市を拠点に、外装リフォーム・建設工事を専門に手がけています。
          外壁塗装・屋根改修・各種防水・シーリング・雨漏り調査まで、
          住まいを長く美しく守る高品質な施工をワンストップでご提供します。
          現地調査・お見積もりは無料。お気軽にご相談ください。
        </p>

        {/* 👇 スクロールアップで出現するCTA */}
        <ScrollUpCTA
          href="/contact"
          label="無料見積もり・お問い合わせ"
          className="mt-5"
        />
      </section>

      {/* ③ JSON-LD（構造化データ） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "HomeAndConstructionBusiness",
              name: "株式会社 TS Reform",
              url: "https://ts-reform.jp/",
              description:
                "大阪府豊中市の外装リフォーム・建設工事会社。外壁塗装・屋根改修・防水工事・雨漏り調査まで一貫対応。",
              serviceType: [
                "外装リフォーム工事",
                "外壁塗装",
                "屋根工事・屋根改修",
                "防水工事",
                "シーリング工事",
                "雨漏り調査・補修"
              ],
              image: "https://ts-reform.jp/ogp-home.jpg",
              address: {
                "@type": "PostalAddress",
                postalCode: "561-0813",
                addressRegion: "大阪府",
                addressLocality: "豊中市",
                streetAddress: "小曽根3-6-13"
              },
              telephone: "06-6151-3328",
              areaServed: [{ "@type": "AdministrativeArea", name: "大阪府" }]
            }
          ]),
        }}
      />
    </main>
  );
}
