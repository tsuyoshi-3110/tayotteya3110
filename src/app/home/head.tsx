// src/app/home/head.tsx
import { buildStoreJsonLd } from "@/lib/jsonld/store/store";

export default function Head() {
  const jsonLd = buildStoreJsonLd(
    {
      siteName: "おそうじ処 たよって屋",
      description:
        "大阪・兵庫エリア対応のハウスクリーニング・家事代行・整理収納サービス。",
      logoUrl: "https://tayotteya.shop/ogp-home.jpg",
      ownerTel: "+81 90-6559-9110",
    },
    "https://tayotteya.shop"
  );

  return (
    <>
      {/* ✅ SSRで<head>直下に確実に出力 */}
      <script
        type="application/ld+json"
        // XSS/検証系で弾かれないよう < を無害化
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
