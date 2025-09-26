import type { Metadata } from "next";
import StoresClient from "@/components/StoresClient";
import { PhoneSection } from "@/components/PhoneSection";

export const metadata: Metadata = {
  title: "会社情報・拠点一覧｜株式会社 TS Reform",
  description:
    "株式会社 TS Reform の会社情報・拠点紹介ページ。大阪府豊中市を拠点に、外装リフォーム・建設工事を行っています。外壁・屋根・防水工事などの対応エリアや詳細をご紹介します。",
  openGraph: {
    title: "会社情報・拠点一覧｜株式会社 TS Reform",
    description:
      "株式会社 TS Reform の拠点情報。大阪府豊中市の本社を中心に、外装リフォーム・建設工事の各種サービスを提供しています。",
    url: "https://ts-reform.jp/stores",
    siteName: "株式会社 TS Reform",
    images: [
      {
        url: "https://ts-reform.jp/ogpLogo.png",
        width: 1200,
        height: 630,
        alt: "株式会社 TS Reform OGP",
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
        <h1 className="text-2xl lg:text-3xl font-extrabold mb-4 text-white text-outline">
          株式会社 TS Reform ─ 会社情報・拠点一覧
        </h1>
        <p className="leading-relaxed text-white text-outline">
          <strong>株式会社 TS Reform</strong> は
          <strong>大阪府豊中市</strong>を拠点に、
          外装リフォーム・建設工事を専門に行っています。
          <br className="hidden lg:block" />
          本社所在地やサービス対応エリア、詳細情報をご確認いただけます。
        </p>
      </section>

      {/* 電話番号や連絡先セクション */}
      <section className="max-w-4xl mx-auto text-center mb-12">
        <PhoneSection />
      </section>

      {/* 拠点・サービス紹介カードのクライアントレンダリング（Firestore対応） */}
      <StoresClient />
    </main>
  );
}
