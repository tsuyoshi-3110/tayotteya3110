import type { Metadata } from "next";
import StoresClient from "@/components/StoresClient";
import { PhoneSection } from "@/components/PhoneSection";

export const metadata: Metadata = {
  title: "店舗一覧｜おそうじ処 たよって屋",
  description:
    "おそうじ処 たよって屋の店舗一覧ページ。大阪・兵庫エリア対応のハウスクリーニング、家事代行、整理収納サービスの拠点情報をご紹介します。",
  openGraph: {
    title: "店舗一覧｜おそうじ処 たよって屋",
    description:
      "おそうじ処 たよって屋の各店舗情報。地域ごとのサービス対応エリア、店舗紹介、連絡先を掲載しています。",
    url: "https://tayotteya.com/stores", // 本番URLに置き換え
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

export default function StoresPage() {
  return (
    <main className="px-4 py-16">
      {/* ページタイトル・説明文 */}
      <section className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-2xl lg:text-3xl font-extrabold mb-4 text-white/80">
          おそうじ処 たよって屋 ─ 店舗一覧
        </h1>
        <p className="leading-relaxed text-white/80">
          <strong>おそうじ処 たよって屋</strong> は
          <strong>大阪府・兵庫県</strong>を中心に
          ハウスクリーニング・家事代行・整理収納サービスを提供しています。
          <br className="hidden lg:block" />
          各店舗のサービス対応エリアや詳細情報をこちらからご確認いただけます。
        </p>
      </section>

      {/* 電話番号や連絡先セクション */}
      <section className="max-w-4xl mx-auto text-center mb-12">
        <PhoneSection />
      </section>

      {/* 店舗カードのクライアントレンダリング（Firestore対応） */}
      <StoresClient />
    </main>
  );
}
