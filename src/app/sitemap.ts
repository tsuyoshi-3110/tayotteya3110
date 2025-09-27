// app/sitemap.ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://tayotteya.shop";

  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    // ほか主要ページ...
    // ★ 東淀川区LP（ヘッダー非表示だが、サイトマップには載せる）
    { url: `${base}/areas/higashiyodogawa`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
