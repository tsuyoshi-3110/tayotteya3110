// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import ThemeBackground from "@/components/ThemeBackground";
import WallpaperBackground from "@/components/WallpaperBackground";
import SubscriptionOverlay from "@/components/SubscriptionOverlay";
import AnalyticsLogger from "@/components/AnalyticsLogger";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { CartProvider } from "@/lib/cart/CartContext"; // ← これを追加
import {
  kosugiMaru, notoSansJP, shipporiMincho, reggaeOne, yomogi, hachiMaruPop,
} from "@/lib/font";
import { seo, site, pageUrl } from "@/config/site";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// 共通メタ
export const metadata: Metadata = seo.base();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

function toLD(obj: unknown) {
  return JSON.stringify(obj).replace(/<\//g, "<\\/");
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sameAs = Object.values(site.socials).filter(Boolean);

  const ldGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.baseUrl}#org`,
        name: site.name,
        url: site.baseUrl,
        logo: pageUrl(site.logoPath),
        ...(site.tel ? { telephone: site.tel } : {}),
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${site.baseUrl}#website`,
        name: site.name,
        url: site.baseUrl,
        publisher: { "@id": `${site.baseUrl}#org` },
        // 検索ページがある場合のみ有効化
        // potentialAction: {
        //   "@type": "SearchAction",
        //   target: `${site.baseUrl}/search?q={search_term_string}`,
        //   "query-input": "required name=search_term_string",
        // },
      },
      ...(site.tel
        ? [{
            "@type": "LocalBusiness",
            "@id": `${site.baseUrl}#local`,
            name: site.name,
            url: site.baseUrl,
            telephone: site.tel,
          }]
        : []),
    ],
  };

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
        <link rel="preload" as="image" href={site.logoPath} type="image/png" />
        <Script
          id="ld-graph"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: toLD(ldGraph) }}
        />
      </head>

      <body className="relative min-h-[100dvh] flex flex-col">
        <WallpaperBackground />
        <ThemeBackground />
        <AnalyticsLogger />
        <CartProvider>
          <SubscriptionOverlay siteKey={SITE_KEY} />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
