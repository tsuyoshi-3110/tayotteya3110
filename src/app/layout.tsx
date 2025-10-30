// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import ThemeBackground from "@/components/ThemeBackground";
import WallpaperBackground from "@/components/WallpaperBackground";
import SubscriptionOverlay from "@/components/SubscriptionOverlay";
import AnalyticsLogger from "@/components/AnalyticsLogger";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { CartProvider } from "@/lib/cart/CartContext";
import {
  kosugiMaru, notoSansJP, shipporiMincho, reggaeOne, yomogi, hachiMaruPop,
} from "@/lib/font";
import { seo, site } from "@/config/site";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// ✅ ここは1行だけ：全ページ共通のメタは site.ts に集約
export const metadata: Metadata = seo.base();

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
        <link rel="preload" as="image" href={site.logoPath} type="image/png" />
        {/* ✅ Search Console meta は seo.base() から自動出力されるので不要 */}
      </head>

      <body className="relative min-h-[100dvh] flex flex-col">
        <SubscriptionOverlay siteKey={SITE_KEY} />
        <AnalyticsLogger />
        <WallpaperBackground />
        <ThemeBackground />

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
