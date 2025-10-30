// /app/sitemap.ts
import { type MetadataRoute } from "next";
import { pages, pageUrl } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // /config/site.ts の pages 定義から自動生成
  return Object.values(pages).map((p) => ({
    url: pageUrl(p.path),
    lastModified: now,
    changeFrequency: p.path === "/" ? "weekly" : "monthly",
    priority: p.path === "/" ? 1 : 0.8,
  }));
}
