// app/video-sitemap.xml/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE = "https://tayotteya.shop";

// 絶対URL判定
const isAbs = (u?: string) => !!u && /^https?:\/\//i.test(u);

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
    s = snap.exists ? (snap.data() as any) : {};
  } catch {
    s = {};
  }

  // Firestore: heroVideo を優先、無ければ背景動画のURLから補完
  const hv = (s.heroVideo ?? {}) as any;

  const contentUrl = isAbs(hv.contentUrl)
    ? hv.contentUrl
    : s.type === "video" && isAbs(s.url)
    ? s.url
    : undefined;

  const embedUrl = isAbs(hv.embedUrl) ? hv.embedUrl : undefined;

  let thumbnailUrl = isAbs(hv.thumbnailUrl) ? hv.thumbnailUrl : undefined;
  if (!thumbnailUrl && s.type === "video" && typeof s.url === "string" && /^https?:\/\//i.test(s.url)) {
    thumbnailUrl = s.url.replace(/\.mp4(\?.*)?$/i, ".jpg");
  }

  // サムネ + （本編 or 埋め込み）が無ければ、空の有効サイトマップを返す
  if (!thumbnailUrl || (!contentUrl && !embedUrl)) {
    const empty = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"></urlset>`;
    return new NextResponse(empty, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store, max-age=0, s-maxage=0",
      },
    });
  }

  const duration =
    typeof hv.durationSec === "number" ? Math.round(hv.durationSec) : undefined;
  const pubDate =
    typeof hv.uploadDate === "string" && hv.uploadDate
      ? hv.uploadDate
      : new Date().toISOString();

  const videoBlock = [
    "<video:video>",
    `<video:thumbnail_loc>${esc(thumbnailUrl)}</video:thumbnail_loc>`,
    `<video:title>${esc(hv.name || "紹介動画")}</video:title>`,
    `<video:description>${esc(hv.description || "サービス紹介動画")}</video:description>`,
    contentUrl ? `<video:content_loc>${esc(contentUrl)}</video:content_loc>` : "",
    embedUrl ? `<video:player_loc allow_embed="yes">${esc(embedUrl)}</video:player_loc>` : "",
    duration ? `<video:duration>${duration}</video:duration>` : "",
    `<video:publication_date>${esc(pubDate)}</video:publication_date>`,
    "</video:video>",
  ]
    .filter(Boolean)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${esc(`${BASE}/`)}</loc>
    ${videoBlock}
  </url>
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // 必要があれば後でキャッシュを緩めてOK
      "Cache-Control": "no-store, max-age=0, s-maxage=0",
    },
  });
}
