// src/app/(routes)/news/page.tsx
import type { Metadata } from "next";
import NewsClient from "@/components/NewsClient";

export const metadata: Metadata = {
  title: "お知らせ｜株式会社 TS Reform",
  description:
    "株式会社 TS Reform の最新情報・キャンペーン・施工事例更新・営業時間に関するお知らせを掲載しています。（大阪府豊中市の外装リフォーム工事会社）",
  openGraph: {
    title: "お知らせ｜株式会社 TS Reform",
    description:
      "株式会社 TS Reform からのお知らせ。最新の施工事例やキャンペーン、営業時間・対応エリアの変更などを随時ご案内します。",
    url: "https://ts-reform.jp/news",
    siteName: "株式会社 TS Reform",
    images: [
      {
        url: "https://ts-reform.jp/ogpLogo.png",
        width: 1200,
        height: 630,
        alt: "株式会社 TS Reform OGP",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  alternates: { canonical: "https://ts-reform.jp/news" },
};

export default function NewsPage() {
  return (
    <main className="px-4 py-12 max-w-4xl mx-auto">
      <NewsClient />
    </main>
  );
}
