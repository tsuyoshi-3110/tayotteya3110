// src/lib/jsonld/store.ts
import type { DocumentData } from "firebase/firestore";

/** 相対→絶対URL化（先頭スラなしも許容）。未指定時は fallbackPath を付与 */
const toAbs = (
  u: string | undefined,
  siteUrl: string,
  fallbackPath = "/ogpLogo.png"
) => {
  const root = siteUrl.replace(/\/$/, "");
  if (!u || typeof u !== "string") return `${root}${fallbackPath}`;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${root}${u.startsWith("/") ? u : `/${u}`}`;
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
 * - siteUrl: ルートURL（https://example.com） ※末尾の / は自動除去
 */
export function buildStoreJsonLd(
  store: DocumentData | undefined,
  siteUrl: string
) {
  const d = (store ?? {}) as Record<string, any>;
  const root = siteUrl.replace(/\/$/, "");

  const siteName =
    d.siteName ?? d.title ?? d.shopName ?? "おそうじ処 たよって屋";
  const description =
    d.description ??
    "大阪府豊中市の家事代行・ハウスクリーニング専門店。水回り清掃から整理収納まで丁寧に対応します。";

  const logoUrl = toAbs(
    d.logoUrl ?? d.headerLogoUrl ?? d.imageUrl1 ?? d.imageUrl,
    root,
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
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "09:00",
        closes: "18:00",
      },
    ];

  // 座標（与えられていれば @type を補完、無ければ既定値）
  const geoInput = d.geo ?? { latitude: d.latitude, longitude: d.longitude };
  const geo =
    geoInput && typeof geoInput === "object"
      ? { "@type": "GeoCoordinates", ...geoInput }
      : { "@type": "GeoCoordinates", latitude: 34.7488, longitude: 135.4821 };

  // SNS / 公式など（重複除去）
  const sameAs: string[] = Array.from(
    new Set(
      (d.sameAs as string[] | undefined)?.filter(Boolean) ?? [
        root,
        d.instagram ?? "",
        d.line ?? "",
      ]
    )
  ).filter(Boolean);

  // 提供エリア（無指定なら大阪中心＋兵庫も含めて明示）
  const areaServed =
    Array.isArray(d.areaServed) && d.areaServed.length > 0
      ? d.areaServed
      : [
          { "@type": "AdministrativeArea", name: "大阪府" },
          { "@type": "AdministrativeArea", name: "豊中市" },
          { "@type": "AdministrativeArea", name: "大阪市東淀川区" },
          { "@type": "AdministrativeArea", name: "兵庫県" },
        ];

  // エンティティの安定識別子（重複判定の助け）
  const entityId = `${root}#localbusiness`;

  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "CleaningService"],
    "@id": entityId,
    name: siteName,
    description,
    url: toAbs(d.url, root, ""), // d.url が相対でも絶対でもOK。未指定は root
    image: logoUrl,
    logo: logoUrl,
    telephone,
    address,
    openingHoursSpecification,
    geo,
    areaServed,
    sameAs,
    // 任意: 価格帯の目安（例: ¥=安, ¥¥=中, ¥¥¥=高）
    // priceRange: "¥¥",
  };
}
