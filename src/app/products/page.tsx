import type { Metadata } from "next";
import ProductsClient from "@/components/ProductsClient";

export const metadata: Metadata = {
  title: "サービス一覧｜おそうじ処 たよって屋",
  description:
    "おそうじ処 たよって屋のサービス一覧ページ。ハウスクリーニング、家事代行、整理収納など、暮らしをサポートする各種サービスを写真付きでご紹介します。",
  openGraph: {
    title: "サービス一覧｜おそうじ処 たよって屋",
    description:
      "おそうじ処 たよって屋のサービス紹介ページ。水回り清掃、リビング清掃、整理収納などを写真付きで掲載し、自由に編集できます。",
    url: "https://tayotteya.shop/products", // 本番URLに差し替え
    siteName: "おそうじ処 たよって屋",
    images: [
      {
        url: "/ogpLogo.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
};

export default function ProductsPage() {
  return <ProductsClient />;
}
