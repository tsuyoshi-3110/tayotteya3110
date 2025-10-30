// src/lib/jsonld/store.ts
import type { DocumentData } from "firebase/firestore";

/** 画像URLを絶対URLに */
const toAbs = (u: string | undefined, siteUrl: string, fallbackPath = "/ogpLogo.png") => {
  if (!u || typeof u !== "string") return `${siteUrl}${fallbackPath}`;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${siteUrl}${u.startsWith("/") ? u : `/${u}`}`;
};

/** JPのTELをざっくりE.164(+81)化（失敗時はそのまま返す） */
const toE164JP = (tel?: string) => {
  if (!tel) return undefined;
  const digits = tel.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return `+81${digits.slice(1)}`;
  return digits;
};

/**
 * LocalBusiness / CleaningService のJSON-LDを生成（欠損OK）
 * - store: Firestoreから取れた任意のshape（undefinedでもOK）
 * - siteUrl: ルートURL（https://example.com）
 */
export function buildStoreJsonLd(store: DocumentData | undefined, siteUrl: string) {
  const d = (store ?? {}) as Record<string, any>;

  const siteName =
    d.siteName ?? d.title ?? d.shopName ?? "おそうじ処 たよって屋";
  const description =
    d.description ??
    "大阪府豊中市の家事代行・ハウスクリーニング専門店。水回り清掃から整理収納まで丁寧に対応します。";
  const logoUrl = toAbs(
    d.logoUrl ?? d.headerLogoUrl ?? d.imageUrl1 ?? d.imageUrl,
    siteUrl,
    "/ogpLogo.png"
  );
  const telephone =
    toE164JP(d.ownerTel ?? d.tel ?? d.phone) ?? "+81 90-6559-9110";

  // 住所（フィールドが無い場合は既定値）
  const address = {
    "@type": "PostalAddress",
    streetAddress: d.address?.streetAddress ?? d.streetAddress ?? "小曽根3-6-13",
    addressLocality: d.address?.addressLocality ?? d.city ?? "豊中市",
    addressRegion: d.address?.addressRegion ?? d.pref ?? "大阪府",
    postalCode: d.address?.postalCode ?? d.postalCode ?? "561-0813",
    addressCountry: d.address?.addressCountry ?? "JP",
  };

  // 営業時間（無ければ月〜土 09:00-18:00）
  const openingHoursSpecification =
    d.openingHoursSpecification ??
    [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "18:00",
      },
    ];

  // 座標（無ければ豊中市付近）
  const geo =
    d.geo ??
    ({
      "@type": "GeoCoordinates",
      latitude: typeof d.latitude === "number" ? d.latitude : 34.7488,
      longitude: typeof d.longitude === "number" ? d.longitude : 135.4821,
    } as const);

  // SNS / 公式など
  const sameAs: string[] = Array.from(
    new Set(
      (d.sameAs as string[] | undefined)?.filter(Boolean) ?? [
        siteUrl,
        d.instagram ?? "",
        d.line ?? "",
      ]
    )
  ).filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "CleaningService"],
    name: siteName,
    image: logoUrl,
    description,
    url: siteUrl,
    telephone,
    address,
    openingHoursSpecification,
    geo,
    sameAs,
  };
}
