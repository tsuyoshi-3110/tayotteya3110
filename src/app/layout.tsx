// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import Script from "next/script";
import ThemeBackground from "@/components/ThemeBackground";
import WallpaperBackground from "@/components/WallpaperBackground";
import SubscriptionOverlay from "@/components/SubscriptionOverlay";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import {
  kosugiMaru,
  notoSansJP,
  shipporiMincho,
  reggaeOne,
  yomogi,
  hachiMaruPop,
} from "@/lib/font";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// ✅ metadata から themeColor を削除
export const metadata: Metadata = {
  title: "おそうじ処 たよって屋｜ハウスクリーニング・家事代行",
  description:
    "おそうじ処 たよって屋は、大阪・兵庫エリア対応のハウスクリーニング・家事代行・整理収納サービス。キッチンや浴室などの水回り、リビング、定期清掃まで、暮らしに寄り添う丁寧なサービスを提供します。",
  keywords: [
    "おそうじ処たよって屋",
    "たよって屋",
    "ハウスクリーニング",
    "家事代行",
    "整理収納",
    "大阪",
    "兵庫",
    "水回り掃除",
    "エアコンクリーニング",
  ],
  authors: [{ name: "おそうじ処 たよって屋" }],
  metadataBase: new URL("https://tayotteya.shop"),
  alternates: {
    canonical: "https://tayotteya.shop/",
  },
  openGraph: {
    title: "おそうじ処 たよって屋｜ハウスクリーニング・家事代行",
    description:
      "大阪・兵庫エリアでハウスクリーニング／家事代行／整理収納を提供。水回りやリビングの徹底清掃、定期清掃までお任せください。",
    url: "https://tayotteya.shop/",
    siteName: "おそうじ処 たよって屋",
    type: "website",
    images: [
      {
        url: "https://tayotteya.shop/ogpLogo.png",
        width: 1200,
        height: 630,
        alt: "おそうじ処 たよって屋 OGP",
      },
    ],
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "おそうじ処 たよって屋｜ハウスクリーニング・家事代行",
    description: "大阪・兵庫エリア対応。水回り／リビング／定期清掃まで丁寧に。",
    images: ["https://tayotteya.shop/ogpLogo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=4" },
      { url: "/icon.png", type: "image/png", sizes: "any" },
    ],
    apple: "/icon.png",
    shortcut: "/favicon.ico?v=4",
  },
};

// ✅ ここで themeColor を指定（root で一括適用）
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        {/* OGP画像の事前読み込み */}
        <link rel="preload" as="image" href="/ogpLogo.png" type="image/png" />
        <meta name="google-site-verification" content="uN73if1NMw0L6lYoLXqKJDBt56lxDXlmbZwfurtPFNs" />
      </head>

      <body className="relative min-h-screen bg-[#ffffff]">
        <SubscriptionOverlay siteKey={SITE_KEY} />
        <WallpaperBackground />
        <ThemeBackground />
        <Header />
        {children}

        {/* 構造化データ */}
        <Script id="ld-json" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CleaningService",
            name: "おそうじ処 たよって屋",
            url: "https://tayotteya.shop/",
            image: "https://tayotteya.shop/ogpLogo.png",
            description:
              "大阪・兵庫エリア対応のハウスクリーニング・家事代行・整理収納サービス。",
            areaServed: [
              { "@type": "AdministrativeArea", name: "大阪府" },
              { "@type": "AdministrativeArea", name: "兵庫県" },
            ],
            serviceType: ["ハウスクリーニング", "家事代行", "整理収納"],
            address: {
              "@type": "PostalAddress",
              addressRegion: "大阪府",
              addressLocality: "豊中市",
              streetAddress: "小曽根3-6-13",
              postalCode: "561-0813",
            },
            telephone: "06-6151-3328",
          })}
        </Script>
      </body>
    </html>
  );
}
