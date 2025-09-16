// src/app/(routes)/home/page.tsx

import type { Metadata } from "next";
import BackgroundVideo from "@/components/backgroundVideo/BackgroundVideo";
import TopFixedText from "@/components/TopFixedText";
import ScrollUpCTA from "@/components/ScrollUpCTA";

export const metadata: Metadata = {
  title: "おそうじ処 たよって屋｜家事代行",
  description:
    "大阪・兵庫エリア対応のハウスクリーニング・家事代行・整理収納は、おそうじ処 たよって屋へ。水回りからリビングの徹底清掃、定期清掃まで暮らしに寄り添う丁寧なサービスを提供します。",
  openGraph: {
    title: "おそうじ処 たよって屋｜家事代行",
    description:
      "ハウスクリーニング／家事代行／整理収納の専門サービス。大阪・兵庫エリアで、高品質な清掃と心地よい暮らしをサポートします。",
    url: "https://tayotteya.shop/",
    siteName: "おそうじ処 たよって屋",
    images: [
      {
        url: "/ogpLogo.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  alternates: { canonical: "https://tayotteya.shop/" },
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
          おそうじ処 たよって屋
        </h1>

        <p className="max-w-3xl mx-auto text-center leading-relaxed text-outline">
          大阪府・兵庫県を中心に、ハウスクリーニング／家事代行／整理収納を提供しています。
          キッチン・浴室などの水回りから、リビングの徹底清掃、定期プランまで。
          ご家庭の状態やご要望に合わせて、無理なく続けられるプランをご提案します。
        </p>

        {/* 👇 スクロールアップで出現するCTA */}
        <ScrollUpCTA
          href="/apply" // 例: 連絡ページ。セクションに飛ばすなら "#contact"
          label="無料相談・お問い合わせ"
          className="mt-5"
        />
      </section>

      {/* ③ JSON-LD（構造化データ） */}
      <script
        type="application/ld+json"
        // 必要に応じて address/telephone を追記してください
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "CleaningService",
              name: "おそうじ処 たよって屋",
              url: "https://tayotteya.shop/",
              description:
                "大阪・兵庫エリア対応のハウスクリーニング・家事代行・整理収納サービス。",
              serviceType: ["ハウスクリーニング", "家事代行", "整理収納"],
              areaServed: [
                { "@type": "AdministrativeArea", name: "大阪府" },
                { "@type": "AdministrativeArea", name: "兵庫県" },
              ],
              image: "https://tayotteya.shop/ogp-home.jpg",
            },
          ]),
        }}
      />
    </main>
  );
}
