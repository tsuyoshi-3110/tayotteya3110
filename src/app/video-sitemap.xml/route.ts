// app/video-sitemap.xml/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
export const runtime = "nodejs";
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "tayotteya3110";
const BASE = "https://tayotteya.shop";

export async function GET() {
  let v:any = {};
  try {
    const snap = await adminDb.collection("siteSettingsEditable").doc(SITE_KEY).get();
    v = (snap.data() as any)?.heroVideo ?? {};
  } catch {}

  const hasThumb = v?.thumbnailUrl && /^https?:\/\//.test(v.thumbnailUrl);
  const hasLoc   = (v?.contentUrl || v?.embedUrl) && /^https?:\/\//.test(v.contentUrl || v.embedUrl);
  if (!hasThumb || !hasLoc) {
    // 要件を満たさないなら空のサイトマップ（200）
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>`, {
      headers: { "Content-Type": "application/xml; charset=utf-8" }
    });
  }

  const duration = typeof v.durationSec === "number" ? Math.round(v.durationSec) : undefined;
  const pubDate  = v.uploadDate || new Date().toISOString();

  const videoTag = `
    <video:video>
      <video:thumbnail_loc>${v.thumbnailUrl}</video:thumbnail_loc>
      <video:title>${escapeXml(v.name || "紹介動画")}</video:title>
      <video:description>${escapeXml(v.description || "")}</video:description>
      ${v.contentUrl ? `<video:content_loc>${v.contentUrl}</video:content_loc>` : ""}
      ${v.embedUrl ? `<video:player_loc allow_embed="yes">${v.embedUrl}</video:player_loc>` : ""}
      ${duration ? `<video:duration>${duration}</video:duration>` : ""}
      <video:publication_date>${pubDate}</video:publication_date>
    </video:video>`.trim();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
          xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
    <url>
      <loc>${BASE}/video</loc>
      ${videoTag}
    </url>
  </urlset>`;

  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

function escapeXml(s:string){return s.replace(/[<>&'"]/g,c=>({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;" }[c] as string))}
