import type { Metadata } from "next";
import AboutClient from "@/components/AboutClient";

export const metadata: Metadata = {
  title: "会社案内・私たちの想い｜株式会社 TS Reform",
  description:
    "株式会社 TS Reform の会社案内・理念紹介ページ。外装リフォーム・建設工事を通じて、お客様の大切な住まいを守り、快適で安心できる暮らしを提供する私たちの姿勢と想いをご紹介します。",
  openGraph: {
    title: "会社案内・私たちの想い｜株式会社 TS Reform",
    description:
      "大阪府豊中市を拠点に、外壁塗装・屋根改修・防水工事など外装リフォーム全般を提供。確かな技術と誠実な対応で、住まいの価値を守り続ける株式会社 TS Reform の理念をお伝えします。",
    url: "https://ts-reform.jp/about",
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
};

export default function AboutPage() {
  return (
    <main className="px-4 py-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mt-3 text-center text-white/80 text-outline">
        会社案内・私たちの想い
      </h1>
      <AboutClient />
    </main>
  );
}
