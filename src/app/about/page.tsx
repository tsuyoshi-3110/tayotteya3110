import type { Metadata } from "next";
import AboutClient from "@/components/AboutClient";

export const metadata: Metadata = {
  title: "私たちの想い｜おそうじ処 たよって屋",
  description:
    "おそうじ処 たよって屋の想いをご紹介します。お客様の暮らしに寄り添い、快適で清潔な空間づくりをサポートする私たちの理念と姿勢をお伝えします。",
  openGraph: {
    title: "私たちの想い｜おそうじ処 たよって屋",
    description:
      "大阪・兵庫エリアで、心を込めたハウスクリーニング・家事代行・整理収納サービスを提供。お客様の笑顔とゆとりある暮らしを第一に考えています。",
    url: "https://tayotteya.shop/about", // 本番URLに差し替え
    siteName: "おそうじ処 たよって屋",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <main className="px-4 py-12 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mt-6 mb-6 text-center text-white/80">
        私たちの想い
      </h1>
      <AboutClient />
    </main>
  );
}
