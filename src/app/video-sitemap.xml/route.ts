// app/video-sitemap.xml/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

export const runtime = "nodejs";

const BASE = "https://tayotteya.shop";

// 絶対URLだけ許可
const abs = (u?: string) =>
  typeof u === "string" && /^https?:\/\//i.test(u) ? u : undefined;

// XMLエスケープ
const esc = (s = "") =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[
      c
    ] as string)
  );

export async function GET() {
  let s: any = {};
  try {
    const snap = await adminDb
      .collection("siteSettingsEditable")
      .doc(SITE_KEY)
      .get();
    s = (snap.data() as any) ?? {};
  } catch {}

  // Firestore 上の heroVideo を優先し、無ければ BackgroundVideo の url などから補完
  const hv = s.heroVideo ?? {};
  const contentUrl = abs(hv.contentUrl ?? (s.type === "video" ? s.url : undefined));
  const embedUrl = abs(hv.embedUrl);
  const thumbnailUrl =
    abs(hv.thumbnailUrl) ??
    (typeof s.url === "string" && s.type === "video"
      ? abs(s.url.replace(/\.mp4(\?.*)?$/i, ".jpg"))
      : undefined);

  // 最低限: サムネ + （コンテンツ or 埋め込み）のどちらかが無ければ、空サイトマップを返す
  if (!thumbnailUrl || (!contentUrl && !embedUrl)) {
    const empty = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"></urlset>`;
    return new NextResponse(empty, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const duration =
    typeof hv.durationSec === "number" ? Math.round(hv.durationSec) : undefined;
  const pub = hv.uploadDate || new Date().toISOString();

  const videoTag = [
    "<video:video>",
    `<video:thumbnail_loc>${thumbnailUrl}</video:thumbnail_loc>`,
    `<video:title>${esc(hv.name || "紹介動画")}</video:title>`,
    `<video:description>${esc(hv.description || "サービス紹介動画")}</video:description>`,
    contentUrl ? `<video:content_loc>${contentUrl}</video:content_loc>` : "",
    embedUrl
      ? `<video:player_loc allow_embed="yes">${embedUrl}</video:player_loc>`
      : "",
    duration ? `<video:duration>${duration}</video:duration>` : "",
    `<video:publication_date>${pub}</video:publication_date>`,
    "</video:video>",
  ]
    .filter(Boolean)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${BASE}/</loc>
    ${videoTag}
  </url>
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
