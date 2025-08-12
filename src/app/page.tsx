// src/app/(routes)/home/page.tsx

import type { Metadata } from "next";
import BackgroundVideo from "@/components/backgroundVideo/BackgroundVideo";
import TopFixedText from "@/components/TopFixedText";

export const metadata: Metadata = {
  title: "〇〇屋｜トップページ（テンプレート）",
  description:
    "〇〇屋テンプレートのトップページ。ここに店舗の特徴や商品紹介を記述します。",
  openGraph: {
    title: "〇〇屋｜トップページ（テンプレート）",
    description:
      "テンプレート用のトップページ。ここに店舗の紹介やサービスの特徴を記述できます。",
    url: "https://your-site-key.vercel.app/",
    siteName: "〇〇屋（テンプレート）",
    images: [
      {
        url: "/ogp-home.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  alternates: { canonical: "https://your-site-key.vercel.app/" },
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

        {/* ページタイトルとリード文（テンプレート用） */}
        <h1 className="text-3xl lg:text-4xl font-extrabold text-center leading-tight mb-6">
          〇〇屋（テンプレート）
          <br />
          店舗トップページ
        </h1>

        <p className="max-w-3xl mx-auto text-center leading-relaxed">
          こちらはテンプレート用のトップページです。開業年数や店舗のこだわり、
          提供する商品やサービス内容を自由に編集・反映可能です。
        </p>
      </section>

      {/* ③ JSON-LD（構造化データ）テンプレート */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Restaurant",
              name: "〇〇屋 本店",
              address: {
                "@type": "PostalAddress",
                addressLocality: "〇〇市〇〇区",
              },
              servesCuisine: "Crepe",
              url: "https://your-site-key.vercel.app/",
            },
            {
              "@context": "https://schema.org",
              "@type": "Restaurant",
              name: "〇〇屋 支店",
              address: {
                "@type": "PostalAddress",
                addressLocality: "△△市△△区",
              },
              servesCuisine: "Crepe",
              url: "https://your-site-key.vercel.app/",
            },
          ]),
        }}
      />
    </main>
  );
}
