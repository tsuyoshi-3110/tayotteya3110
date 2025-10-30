// src/lib/jsonld/product.ts
import type { Product } from "@/types/Product";

/**
 * FirestoreのProductデータから構造化データ(JSON-LD)を生成
 */
export function buildProductJsonLd(product: Product, siteUrl: string) {
  const price = product.price ?? 0;
  const currency = product.currency ?? "JPY";

  // 画像か動画のURLを使う（構造化データではimageが推奨）
  const image =
    product.mediaType === "image"
      ? product.mediaURL
      : `${siteUrl}/images/noimage.jpg`;

  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    image,
    description: product.body?.substring(0, 120) ?? "",
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "Pageit Store",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: price.toString(),
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/products/${product.id}`,
    },
  };
}
