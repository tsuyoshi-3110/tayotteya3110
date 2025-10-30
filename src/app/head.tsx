// app/head.tsx
import { buildStoreJsonLd } from "@/lib/jsonld/store/store";
import { adminDb } from "@/lib/firebase-admin";

// Admin SDKを使うためNode.js実行を明示
export const runtime = "nodejs";

// サイトキーとサイトURL
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "tayotteya3110";
const SITE_URL = "https://tayotteya.shop";

/* ========= JSON-LD builders ========= */
const buildOrganizationJsonLd = (opts: {
  name: string;
  url: string;
  logo: string;
  sameAs?: string[];
}) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: opts.name,
  url: opts.url,
  logo: opts.logo,
  sameAs: opts.sameAs ?? [],
});

const buildWebSiteJsonLd = (opts: { url: string; name: string }) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: opts.url,
  name: opts.name,
  inLanguage: "ja-JP",
});

/* ========= Firestore ========= */
async function fetchSiteSettings() {
  try {
    const snap = await adminDb
      .collection("siteSettingsEditable")
      .doc(SITE_KEY)
      .get();
    return (snap.data() as any) ?? {};
  } catch {
    return {}; // 取得失敗時も安全に既定値で出力
  }
}

/* ========= Utils ========= */
const safe = (obj: object) => JSON.stringify(obj).replace(/</g, "\\u003c");

/* ========= Head ========= */
export default async function Head() {
  // 1) Firestoreから設定（欠損OK）
  const settings = await fetchSiteSettings();

  // 2) Organization / WebSite / LocalBusiness を生成
  const orgLd = buildOrganizationJsonLd({
    name: settings.siteName ?? "おそうじ処 たよって屋",
    url: SITE_URL,
    logo:
      settings.logoUrl ??
      settings.headerLogoUrl ??
      `${SITE_URL}/ogpLogo.png`,
    sameAs: [
      settings.instagram ?? "https://www.instagram.com/yuki.tayotte2017",
      settings.line ?? "https://lin.ee/YcKAJja",
    ].filter(Boolean),
  });

  const webSiteLd = buildWebSiteJsonLd({
    url: SITE_URL,
    name: settings.siteName ?? "おそうじ処 たよって屋",
  });

  const localLd = buildStoreJsonLd(settings, SITE_URL);

  // 3) head にインライン埋め込み
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safe(orgLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safe(webSiteLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safe(localLd) }}
      />
    </>
  );
}
