// app/products/page.tsx
import type { Metadata } from "next";
import ProductsECClient from "@/components/productsEC/ProductsECClient";

const title = "サービス一覧｜たよって屋";
const description =
  "たよって屋の家事代行・ハウスクリーニングサービス一覧ページ。水回りやキッチン、お風呂掃除など、日常のお手伝いをプロのスタッフが丁寧に行います。オンラインから簡単にご予約いただけます。";
const ogImage = "/ogp-products.jpg"; // public 配下の画像

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://meg-nekoneote.com/products",
    siteName: "たよって屋",
    images: [
      {
        url: ogImage as string,
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website", // product ではなく website
  } satisfies Metadata["openGraph"],
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
};

export default function ProductsPage() {
  return <ProductsECClient />;
}
