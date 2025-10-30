// src/lib/jsonld/video.ts
import type { DocumentData } from "firebase/firestore";

/** 相対→絶対URL */
const toAbs = (u: string | undefined, siteUrl: string, fallbackPath = "/ogpLogo.png") => {
  if (!u || typeof u !== "string") return `${siteUrl}${fallbackPath}`;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${siteUrl}${u.startsWith("/") ? u : `/${u}`}`;
};

/** VideoObject を “ある時だけ” 生成（要件満たさなければ null） */
export function buildVideoJsonLd(settings: DocumentData | undefined, siteUrl: string) {
  const d = (settings ?? {}) as Record<string, any>;

  // 背景動画（BackgroundMedia の url/type） or 明示 heroVideo 設定のどちらかが揃っているとき
  const isVideo =
    d?.type === "video" ||
    !!d?.heroVideo?.contentUrl ||
    !!d?.heroVideo?.embedUrl;

  if (!isVideo) return null;

  // 入力候補
  const contentUrl: string | undefined =
    d?.heroVideo?.contentUrl ?? (d?.type === "video" ? d?.url : undefined);
  const embedUrl: string | undefined = d?.heroVideo?.embedUrl;
  const name: string =
    d?.heroVideo?.name ?? `${d?.siteName ?? "おそうじ処 たよって屋"} 紹介動画`;
  const description: string =
    d?.heroVideo?.description ??
    d?.description ??
    "サービス紹介動画です。";
  const thumbnailUrl: string = toAbs(
    d?.heroVideo?.thumbnailUrl ??
      // 背景動画のポスター画像があればそれを推定（なければ OGP）
      (typeof d?.url === "string" ? d.url.replace(/\.mp4(\?.*)?$/, ".jpg") : undefined) ??
      d?.headerLogoUrl,
    siteUrl,
    "/ogpLogo.png"
  );
  const uploadDate: string =
    d?.heroVideo?.uploadDate ??
    // Firestore に updatedAt があれば利用、なければ今日
    (d?.updatedAt?.toDate?.() ? d.updatedAt.toDate().toISOString() : new Date().toISOString());

  // 最低限（Google推奨の必須）：name / description / thumbnailUrl / uploadDate
  const video: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl: [thumbnailUrl],
    uploadDate,
    inLanguage: "ja-JP",
  };

  // どちらか入ればベター
  if (contentUrl) video.contentUrl = contentUrl;
  if (embedUrl) video.embedUrl = embedUrl;

  // contentUrl と embedUrl の両方が無い場合でも最低限は通るが、念のためサムネだけの動画は回避
  if (!contentUrl && !embedUrl) return null;

  // 任意（あれば自動で拾う）
  if (d?.heroVideo?.duration) video.duration = d.heroVideo.duration; // ISO8601 例: "PT30S"
  if (d?.heroVideo?.publisherName || d?.siteName) {
    video.publisher = {
      "@type": "Organization",
      name: d?.heroVideo?.publisherName ?? d?.siteName ?? "おそうじ処 たよって屋",
      logo: toAbs(d?.headerLogoUrl, siteUrl, "/ogpLogo.png"),
    };
  }

  return video;
}
