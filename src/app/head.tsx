// app/head.tsx
import { adminDb } from "@/lib/firebase-admin";
import { buildStoreJsonLd } from "@/lib/jsonld/store";
import { buildVideoJsonLd } from "@/lib/jsonld/video";

export const runtime = "nodejs";
// 動的化したい場合は下行もOK（任意）
// export const dynamic = "force-dynamic";

const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "tayotteya3110";
const SITE_URL = "https://tayotteya.shop";

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

async function fetchSiteSettings() {
  try {
    const snap = await adminDb
      .collection("siteSettingsEditable")
      .doc(SITE_KEY)
      .get();
    return (snap.data() as any) ?? {};
  } catch {
    return {};
  }
}

const safe = (o: object) => JSON.stringify(o).replace(/</g, "\\u003c");

export default async function Head() {
  const settings = await fetchSiteSettings();

  const orgLd = buildOrganizationJsonLd({
    name: settings.siteName ?? "おそうじ処 たよって屋",
    url: SITE_URL,
    logo:
      settings.logoUrl ?? settings.headerLogoUrl ?? `${SITE_URL}/ogpLogo.png`,
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

  // ★ ここが今回のポイント：動画が用意されていれば VideoObject を埋め込む
  const videoLd = buildVideoJsonLd(settings, SITE_URL);

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
      {videoLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safe(videoLd) }}
        />
      )}
    </>
  );
}
