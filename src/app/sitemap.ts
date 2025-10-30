// app/sitemap.ts
import { type MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://tayotteya.shop";
  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    // 他に固定ページがあればここに追記（/pricing など）
    {
      url: `${base}/areas/local`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
