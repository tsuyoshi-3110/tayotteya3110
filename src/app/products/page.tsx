// app/products/page.tsx
import type { Metadata } from "next";
import ProductsClient from "@/components/products/ProductsClient";

const title = "サービス一覧｜たよって屋";
const description =
  "たよって屋の家事代行・ハウスクリーニングサービス一覧ページ。水回り清掃や整理整頓、エアコン掃除など、プロの技で快適な暮らしをサポートします。";
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
    type: "website",
  } satisfies Metadata["openGraph"],
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
};

export default function ProductsPage() {
  return <ProductsClient />;
}
