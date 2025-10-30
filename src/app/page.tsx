// src/app/home/page.tsx
import type { Metadata } from "next";
import BackgroundVideo from "@/components/backgroundVideo/BackgroundVideo";
import TopFixedText from "@/components/TopFixedText";
import TopVisibleSections from "@/components/TopVisibleSections";
import { buildStoreJsonLd } from "@/lib/jsonld/store/product";

export async function generateMetadata(): Promise<Metadata> {
  // JSON-LDを生成（Firestoreを使わない場合は固定値でOK）
  const jsonLd = buildStoreJsonLd(
    {
      siteName: "おそうじ処 たよって屋",
      description:
        "大阪・兵庫エリア対応のハウスクリーニング・家事代行・整理収納サービス。",
      logoUrl: "https://tayotteya.shop/ogpLogo.png",
      ownerTel: "+81 90-6559-9110",
    },
    "https://tayotteya.shop"
  );

  return {
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
    // ✅ JSON-LDを<head>に自動挿入
    other: {
      "script:ld+json": JSON.stringify(jsonLd),
    },
  };
}

export default function HomePage() {
  return (
    <main className="w-full overflow-x-hidden">
      {/* ① ファーストビュー */}
      <section className="relative h-screen overflow-hidden">
        <BackgroundVideo />
      </section>

      {/* ② テキスト紹介 */}
      <section className="relative z-10 text-white px-4 py-20">
        <TopFixedText />

        <h1 className="text-3xl lg:text-4xl font-extrabold text-center leading-tight mb-6 text-outline">
          おそうじ処 たよって屋
        </h1>

        <p className="max-w-3xl mx-auto text-center leading-relaxed text-outline">
          大阪府・兵庫県を中心に、ハウスクリーニング／家事代行／整理収納を提供しています。
          キッチン・浴室などの水回りから、リビングの徹底清掃、定期プランまで。
          ご家庭の状態やご要望に合わせて、無理なく続けられるプランをご提案します。
        </p>

        <TopVisibleSections />
      </section>
    </main>
  );
}
