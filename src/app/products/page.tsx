import type { Metadata } from "next";
import ProductsClient from "@/components/ProductsClient";

export const metadata: Metadata = {
  title: "施工サービス一覧｜株式会社 TS Reform",
  description:
    "株式会社 TS Reform の施工サービス一覧ページ。外壁塗装、屋根工事、防水工事、雨漏り調査・補修など、住まいを守る各種リフォームサービスをご紹介します。",
  openGraph: {
    title: "施工サービス一覧｜株式会社 TS Reform",
    description:
      "株式会社 TS Reform の外装リフォームサービス。外壁塗装、屋根改修、防水工事、シーリング、雨漏り補修などを写真付きで掲載し、詳細をご確認いただけます。",
    url: "https://ts-reform.jp/products",
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

export default function ProductsPage() {
  return <ProductsClient />;
}
