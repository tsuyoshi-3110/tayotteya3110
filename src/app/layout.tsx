import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  kosugiMaru,
  notoSansJP,
  shipporiMincho,
  reggaeOne,
  yomogi,
  hachiMaruPop,
} from "@/lib/font";
import "./globals.css";
import Header from "@/components/Header";
import Script from "next/script";
import ThemeBackground from "@/components/ThemeBackground";
import WallpaperBackground from "@/components/WallpaperBackground";
import SubscriptionOverlay from "@/components/SubscriptionOverlay";
import AnalyticsLogger from "@/components/AnalyticsLogger";
import FontLoader from "@/components/FontLoader";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "おそうじ処 たよって屋｜ハウスクリーニング・家事代行",
  description:
    "おそうじ処 たよって屋は、大阪・兵庫エリア対応のハウスクリーニング・家事代行・整理収納サービス。キッチンや浴室などの水回り、リビング、定期清掃まで、暮らしに寄り添う丁寧なサービスを提供します。",
  openGraph: {
    title: "おそうじ処 たよって屋｜ハウスクリーニング・家事代行",
    description:
      "大阪・兵庫エリアでハウスクリーニング／家事代行／整理収納を提供。水回りやリビングの徹底清掃、定期清掃までお任せください。",
    url: "https://tayotteya.shop/",
    siteName: "おそうじ処 たよって屋",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <link
          rel="preload"
          as="image"
          href="/images/wallpaper/kamon.jpg"
          type="image/webp"
        />
        <meta name="theme-color" content="#ffffff" />
        {/* Google Search Console */}
      </head>
      <body className="relative min-h-screen font-[var(--selected-font)]">
        <SubscriptionOverlay siteKey={SITE_KEY} />
        <AnalyticsLogger />
        <WallpaperBackground />
        <ThemeBackground />
        <Header />
        <FontLoader />
        {children}

        {/* 構造化データ（CleaningService） */}
        <Script
          id="ld-json"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CleaningService",
            name: "おそうじ処 たよって屋",
            url: "https://tayotteya.shop/",
            image: "https://tayotteya.shop/ogp.png",
            description:
              "大阪・兵庫エリア対応のハウスクリーニング・家事代行・整理収納サービス。",
            areaServed: [
              { "@type": "AdministrativeArea", name: "大阪府" },
              { "@type": "AdministrativeArea", name: "兵庫県" },
            ],
            serviceType: ["ハウスクリーニング", "家事代行", "整理収納"],
            // 住所・電話が確定したら以下をアンコメント
            // address: {
            //   "@type": "PostalAddress",
            //   addressRegion: "大阪府",
            //   addressLocality: "豊中市",
            //   streetAddress: "（任意で入力）",
            //   postalCode: "（任意で入力）",
            // },
            // telephone: "（任意で入力）",
          })}
        </Script>
      </body>
    </html>
  );
}
