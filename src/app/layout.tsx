// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import Script from "next/script";
import ThemeBackground from "@/components/ThemeBackground";
import WallpaperBackground from "@/components/WallpaperBackground";
import SubscriptionOverlay from "@/components/SubscriptionOverlay";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

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
  icons: {
    icon: [
      { url: "/favicon.ico?v=3" },
      { url: "/icon.png", type: "image/png", sizes: "any" }, // 置いていれば自動で使われる
    ],
    apple: "/icon.png",
    shortcut: "/favicon.ico?v=3",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteKey = "tayotteya";

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        {/* Favicon（キャッシュ更新用クエリ付き） */}
        <link rel="icon" href="/favicon.ico?v=3" />
        {/* OGP画像の事前読み込み（PNG） */}
        <link rel="preload" as="image" href="/ogpLogo.png" type="image/png" />
        <meta name="theme-color" content="#ffffff" />

        {/* OGP & Twitterカード（保険として head にも明示） */}
        <meta
          property="og:title"
          content="おそうじ処 たよって屋｜ハウスクリーニング・家事代行"
        />
        <meta
          property="og:description"
          content="大阪・兵庫エリアでハウスクリーニング／家事代行／整理収納を提供。水回りやリビングの徹底清掃、定期清掃までお任せください。"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tayotteya.shop/" />
        <meta property="og:site_name" content="おそうじ処 たよって屋" />
        <meta property="og:locale" content="ja_JP" />
        <meta property="og:image" content="https://tayotteya.shop/ogpLogo.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="おそうじ処 たよって屋｜ハウスクリーニング・家事代行"
        />
        <meta
          name="twitter:description"
          content="大阪・兵庫エリア対応。水回り／リビング／定期清掃まで丁寧に。"
        />
        <meta name="twitter:image" content="https://tayotteya.shop/ogpLogo.png" />
        {/* Search Console を使う場合は下に site verification を追加 */}
        {/* <meta name="google-site-verification" content="XXXXXXXX" /> */}
      </head>

      <body className="relative min-h-screen bg-[#ffffff]">
        <SubscriptionOverlay siteKey={siteKey} />
        <WallpaperBackground />
        <ThemeBackground />
        <Header />
        {children}

        {/* 構造化データ（CleaningService） */}
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
            // 住所や電話を掲載する場合は以下をアンコメントして入力
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
