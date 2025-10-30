// src/lib/jsonld/store.ts
import type { DocumentData } from "firebase/firestore";

/**
 * たよって屋（家事代行サービス）専用の構造化データ（LocalBusiness）
 */
export function buildStoreJsonLd(store: DocumentData, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.siteName || "たよって屋",
    image: store.logoUrl || `${siteUrl}/ogp.jpg`,
    description:
      store.description ||
      "大阪府豊中市の家事代行・ハウスクリーニング専門店たよって屋。キッチンやお風呂、トイレなどの水回り清掃から整理整頓まで、経験豊富なスタッフが丁寧に対応いたします。",
    url: "https://tayotteya.shop/",
    telephone: store.ownerTel || "+81 90-6559-9110",
    address: {
      "@type": "PostalAddress",
      streetAddress: "小曽根3-6-13",
      addressLocality: "豊中市",
      addressRegion: "大阪府",
      postalCode: "561-0813",
      addressCountry: "JP",
    },
    openingHours: "Mo-Sa 09:00-18:00",
    geo: {
      "@type": "GeoCoordinates",
      latitude: store.latitude ?? 34.7488, // 豊中市小曽根付近
      longitude: store.longitude ?? 135.4821,
    },
    sameAs: [
      "https://tayotteya.shop/",
      // SNSアカウントを追加する場合はここに追記
    ],
  };
}
