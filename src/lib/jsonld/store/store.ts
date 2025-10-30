// src/lib/jsonld/store.ts
import type { DocumentData } from "firebase/firestore";

export function buildStoreJsonLd(store: DocumentData, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness", // 必要なら ["LocalBusiness","CleaningService"] にしてもOK
    name: store.siteName || "たよって屋",
    image: store.logoUrl || `${siteUrl}/ogp.jpg`,
    description:
      store.description ||
      "大阪府豊中市の家事代行・ハウスクリーニング専門店たよって屋。キッチンやお風呂、トイレなどの水回り清掃から整理整頓まで、経験豊富なスタッフが丁寧に対応いたします。",
    url: siteUrl,
    telephone: store.ownerTel || "+81 90-6559-9110",
    address: {
      "@type": "PostalAddress",
      streetAddress: "小曽根3-6-13",
      addressLocality: "豊中市",
      addressRegion: "大阪府",
      postalCode: "561-0813",
      addressCountry: "JP",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"
        ],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    geo: {
      "@type": "GeoCoordinates",
      latitude: store.latitude ?? 34.7488,
      longitude: store.longitude ?? 135.4821,
    },
    sameAs: ["https://tayotteya.shop/"],
  };
}
