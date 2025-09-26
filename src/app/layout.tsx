// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import ThemeBackground from "@/components/ThemeBackground";
import WallpaperBackground from "@/components/WallpaperBackground";
import SubscriptionOverlay from "@/components/SubscriptionOverlay";
import AnalyticsLogger from "@/components/AnalyticsLogger";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { adminDb } from "@/lib/firebase-admin";
import {
  kosugiMaru,
  notoSansJP,
  shipporiMincho,
  reggaeOne,
  yomogi,
  hachiMaruPop,
} from "@/lib/font";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// ====== 既存の metadata/viewport はそのまま（省略） ======
export const metadata: Metadata = {
  title: "株式会社 TS Reform｜外装リフォーム・建設工事",
  description:
    "株式会社 TS Reform は、大阪府豊中市を拠点とする建設業・外装リフォーム工事の専門会社です。外壁・屋根・防水などの各種リフォームに対応。お気軽にご相談ください。（TEL: 06-6151-3328）",
  keywords: ["TS Reform", "外装リフォーム", "建設業", "外壁塗装", "屋根工事", "防水工事", "大阪", "豊中市"],
  authors: [{ name: "株式会社 TS Reform" }],
  metadataBase: new URL("https://ts-reform.jp"),
  alternates: { canonical: "https://ts-reform.jp/" },
  openGraph: {
    title: "株式会社 TS Reform｜外装リフォーム・建設工事",
    description: "大阪府豊中市の外装リフォーム・建設工事なら株式会社 TS Reform。外壁・屋根・防水など幅広く対応します。",
    url: "https://ts-reform.jp/",
    siteName: "株式会社 TS Reform",
    type: "website",
    images: [{ url: "https://ts-reform.jp/ogpLogo.png", width: 1200, height: 630, alt: "株式会社 TS Reform OGP" }],
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "株式会社 TS Reform｜外装リフォーム・建設工事",
    description: "大阪府豊中市の外装リフォーム・建設工事会社。外壁・屋根・防水などに対応。",
    images: ["https://ts-reform.jp/ogpLogo.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico?v=1" }, { url: "/icon.png", type: "image/png", sizes: "any" }],
    apple: "/icon.png",
    shortcut: "/favicon.ico?v=1",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 代表店舗（本店）
  const siteSnap = await adminDb.doc(`siteSettings/${SITE_KEY}`).get();
  const site = siteSnap.data() as any | undefined;

  // 連携ON/OFF（editable）
  const editableSnap = await adminDb.doc(`siteSettingsEditable/${SITE_KEY}`).get();
  const editable = editableSnap.data() as any | undefined;
  const enabled: boolean = !!editable?.googleSync?.enabled;

  // 全店舗（支店）: siteStores/{SITE_KEY}/items/*
  const storesSnap = await adminDb.collection(`siteStores/${SITE_KEY}/items`).get();
  const storeDocs = storesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  // 本店の基本情報（siteSettings）
  const businessName: string = site?.siteName || "株式会社 TS Reform";
  const websiteUrl: string = site?.homepageUrl || "https://ts-reform.jp/";
  const telephone: string = site?.ownerPhone || "06-6151-3328";
  const hqAddress: string = site?.ownerAddress || "大阪府豊中市小曽根3-6-13";

  // 本店の緯度経度（ある場合のみ）：editable.address.lat/lng 想定
  const hqLat: number | undefined = editable?.address?.lat;
  const hqLng: number | undefined = editable?.address?.lng;

  // JSON-LD を配列で作成（代表＋各店舗）
  const entries: any[] = [];

  // 代表（Organization と LocalBusiness 本店）
  if (enabled) {
    // Organization（ロゴ）
    entries.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://ts-reform.jp/#organization",
      name: businessName,
      url: websiteUrl,
      logo: {
        "@type": "ImageObject",
        url: "https://ts-reform.jp/ogpLogo.png",
        width: 1200,
        height: 630,
      },
    });

    // 本店の LocalBusiness
    const hqLocal: any = {
      "@context": "https://schema.org",
      "@type": "HomeAndConstructionBusiness",
      "@id": "https://ts-reform.jp/#business",
      name: businessName,
      url: websiteUrl,
      image: "https://ts-reform.jp/ogpLogo.png",
      description:
        "大阪府豊中市を拠点とする建設業・外装リフォーム工事会社。外壁・屋根・防水などに対応。",
      telephone,
      address: {
        "@type": "PostalAddress",
        streetAddress: hqAddress,
        addressCountry: "JP",
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "09:00",
          closes: "18:00",
        },
      ],
      areaServed: [{ "@type": "AdministrativeArea", name: "大阪府" }],
      priceRange: "¥¥",
    };
    if (hqLat && hqLng) {
      hqLocal.geo = { "@type": "GeoCoordinates", latitude: hqLat, longitude: hqLng };
      hqLocal.hasMap = `https://www.google.com/maps?q=${hqLat},${hqLng}`;
    }
    entries.push(hqLocal);

    // 支店（siteStores）
    for (const store of storeDocs) {
      const sName: string = store.name || businessName;
      const sAddress: string = store.address || "";
      const sImage: string | undefined = store.imageURL;
      const sDesc: string | undefined = store.description;

      const storeObj: any = {
        "@context": "https://schema.org",
        "@type": "HomeAndConstructionBusiness",
        "@id": `https://ts-reform.jp/#store-${store.id}`,
        name: sName,
        url: websiteUrl,
        image: sImage || "https://ts-reform.jp/ogpLogo.png",
        description: sDesc || "建設・外装リフォームに対応する店舗拠点です。",
        address: {
          "@type": "PostalAddress",
          streetAddress: sAddress,
          addressCountry: "JP",
        },
        // ここに営業時間や電話が店舗ごとにあるなら追記可
      };

      // ★ 将来：editable 側に店舗ごとの緯度経度を持たせた場合はここで付与
      // 例）editable.storeGeo?.[store.id]?.lat/lng
      const storeLat = editable?.storeGeo?.[store.id]?.lat as number | undefined;
      const storeLng = editable?.storeGeo?.[store.id]?.lng as number | undefined;
      if (storeLat && storeLng) {
        storeObj.geo = { "@type": "GeoCoordinates", latitude: storeLat, longitude: storeLng };
        storeObj.hasMap = `https://www.google.com/maps?q=${storeLat},${storeLng}`;
      }

      entries.push(storeObj);
    }
  }

  return (
    <html
      lang="ja"
      className={`
        ${geistSans.variable} ${geistMono.variable}
        ${kosugiMaru.variable} ${notoSansJP.variable}
        ${yomogi.variable} ${hachiMaruPop.variable} ${reggaeOne.variable} ${shipporiMincho.variable}
        antialiased
      `}
    >
      <head>
        <link rel="preload" as="image" href="/ogpLogo.png" type="image/png" />
        <meta
          name="google-site-verification"
          content="uN73if1NMw0L6lYoLXqKJDBt56lxDXlmbZwfurtPFNs"
        />
      </head>
      <body className="relative min-h-screen bg-[#ffffff]">
        <SubscriptionOverlay siteKey={SITE_KEY} />
        <AnalyticsLogger />
        <WallpaperBackground />
        <ThemeBackground />
        <Header />
        {children}

        {/* JSON-LD（ON時のみ、代表＋全店舗を配列で出力） */}
        {enabled && entries.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(entries) }}
          />
        )}
      </body>
    </html>
  );
}
