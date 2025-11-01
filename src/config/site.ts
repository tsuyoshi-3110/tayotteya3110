// /config/site.ts
import type { Metadata } from "next";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

/* =========================
   URL 基本情報
========================= */
const APP_URL_RAW = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const BASE_URL = APP_URL_RAW.replace(/\/$/, "");
let DOMAIN = "localhost:3000";
try {
  DOMAIN = new URL(BASE_URL).host;
} catch {}

/* =========================
   サイト固有（ここだけ編集）
========================= */
export const site = {
  key: SITE_KEY,
  domain: DOMAIN,
  baseUrl: BASE_URL,
  name: "おそうじ処 たよって屋",
  tagline: "ハウスクリーニング・家事代行（大阪・兵庫）",
  description:
    "大阪・兵庫エリア対応のハウスクリーニング・家事代行・整理収納サービス。大阪市東淀川区、豊中市、吹田市など近隣も丁寧に対応。水回り・リビング・定期清掃まで安心価格。",
  keywords: [
    "おそうじ処たよって屋",
    "たよって屋",
    "ハウスクリーニング",
    "家事代行",
    "整理収納",
    "大阪",
    "兵庫",
    "大阪市東淀川区",
    "水回り掃除",
    "エアコンクリーニング",
  ] as const,
  tel: "+81 90-6559-9110",
  logoPath: "/ogpLogo.png",
  googleSiteVerification: "uN73if1NMw0L6lYoLXqKJDBt56lxDXlmbZwfurtPFNs",
  socials: {
    instagram: "https://www.instagram.com/yuki.tayotte2017",
    line: "https://lin.ee/YcKAJja",
  },
} as const;

/* =========================
   便利ヘルパ
========================= */
export const pageUrl = (path = "/") =>
  `${site.baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const ogImage = (p?: string) => pageUrl(p ?? site.logoPath);

/* =========================
   コピー（集中管理）
========================= */
export const copy = {
  // Home（/）用
  home: {
    headline: site.name,
    description:
      "大阪府・兵庫県を中心に、ハウスクリーニング／家事代行／整理収納を提供しています。キッチン・浴室などの水回りから、リビングの徹底清掃、定期プランまで。ご家庭の状態やご要望に合わせて、無理なく続けられるプランをご提案します。",
  },

  // Stores（/stores）用
  stores: {
    heroTitle: `${site.name} ─ 店舗一覧`,
    heroAreas: "大阪府・兵庫県",
    heroLead:
      "ハウスクリーニング・家事代行・整理収納サービスを提供しています。",
    heroTail:
      "各店舗のサービス対応エリアや詳細情報をこちらからご確認いただけます。",
    // ページ側で「は／を中心に」を書かなくてよい完成文
    heroIntroLine:
      `${site.name}は大阪府・兵庫県を中心にハウスクリーニング・家事代行・整理収納サービスを提供しています。`,
  },
} as const;

/* =========================
   ★ FAQ データ（ここで集約管理）
========================= */
export type FaqItem = { question: string; answer: string };

export const faqItems: FaqItem[] = [
  {
    question: "対応エリアはどこですか？",
    answer:
      "大阪府・兵庫県を中心に対応しています。豊中市・吹田市・東淀川区・池田市・箕面市・尼崎市など、まずはお気軽にご相談ください。",
  },
  {
    question: "見積もりは無料ですか？",
    answer:
      "はい、無料です。現地確認が必要な場合もありますが、費用はいただきません。",
  },
  {
    question: "支払い方法は？",
    answer:
      "現金・銀行振込・各種キャッシュレス（ご相談ください）に対応しています。",
  },
  {
    question: "当日の追加依頼や延長は可能ですか？",
    answer:
      "当日のスケジュール次第ですが、可能な限り柔軟に対応いたします。スタッフへご相談ください。",
  },
  {
    question: "キャンセル料はかかりますか？",
    answer:
      "前日キャンセルは無料、当日キャンセルは作業代の50％を頂戴しております（事前連絡なしの不在は100％）。",
  },
];

/* =========================
   ページ辞書（ogImage は任意）
========================= */
type OgType = "website" | "article";
export type PageDef = {
  path: string;
  title: string;
  description: string;
  ogType: OgType;
  ogImage?: string;
};

const PAGES = {
  home: {
    path: "/",
    title: `${site.name}｜家事代行`,
    description:
      "大阪・兵庫エリア対応のハウスクリーニング／家事代行／整理収納のご案内。",
    ogType: "website",
  },
  about: {
    path: "/about",
    title: `私たちの想い｜${site.name}`,
    description:
      "お客様の暮らしに寄り添い、快適で清潔な空間づくりをサポートする私たちの理念。",
    ogType: "website",
  },
  news: {
    path: "/news",
    title: `お知らせ｜${site.name}`,
    description: `${site.name} の最新情報・キャンペーン・営業時間などのお知らせ。`,
    ogType: "website",
  },
  areasLocal: {
    path: "/areas/local",
    title: `東淀川区の家事代行・ハウスクリーニング｜${site.name}`,
    description:
      "東淀川区（淡路・上新庄…）で家事代行・ハウスクリーニング。定期/スポット対応。",
    ogType: "article",
  },
  products: {
    path: "/products",
    title: `サービス一覧｜${site.name}`,
    description:
      `${site.name}の家事代行・ハウスクリーニングのサービス一覧。水回り清掃や整理整頓、エアコン掃除などを掲載。`,
    ogType: "website",
    ogImage: "/ogp-products.jpg",
  },
  productsEC: {
    path: "/products-ec",
    title: `サービス一覧（オンライン予約）｜${site.name}`,
    description:
      `${site.name}のサービス一覧（オンライン予約対応）。水回り・キッチン・浴室など日常のお手伝いをプロが丁寧に実施。`,
    ogType: "website",
    ogImage: "/ogp-products.jpg",
  },
  projects: {
    path: "/projects",
    title: `サービス一覧｜${site.name}`,
    description:
      `${site.name}のサービス紹介ページ。水回り清掃、リビング清掃、整理収納などを写真付きで掲載。`,
    ogType: "website",
  },
  stores: {
    path: "/stores",
    title: `店舗一覧｜${site.name}`,
    description:
      `${site.name}の店舗一覧ページ。大阪・兵庫エリア対応の拠点情報をご紹介します。`,
    ogType: "website",
  },
  faq: {
    path: "/faq",
    title: `よくある質問（FAQ）｜${site.name}`,
    description:
      `料金・対応エリア・キャンセル・支払い方法など、${site.name}のハウスクリーニング／家事代行に関するよくある質問。`,
    ogType: "article",
  },
} as const;

export type PageKey = keyof typeof PAGES;
export const pages: Record<PageKey, PageDef> =
  PAGES as unknown as Record<PageKey, PageDef>;

/* =========================
   使い回し Metadata ビルダー
========================= */
export const seo = {
  // 全ページ共通（app/layout.tsx の metadata に）
  base: (): Metadata => ({
    title: `${site.name}｜${site.tagline}`,
    description: site.description,
    keywords: Array.from(site.keywords),
    authors: [{ name: site.name }],
    metadataBase: new URL(site.baseUrl),
    alternates: { canonical: pageUrl("/") },

    // ✅ Search Console 所有権メタ（集中管理）
    verification: site.googleSiteVerification
      ? { google: site.googleSiteVerification }
      : undefined,

    // ✅ 追加: robots 明示（Googlebot 含む / ハイフン区切りキーは文字列リテラル）
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },

    openGraph: {
      title: `${site.name}｜${site.tagline}`,
      description: site.description,
      url: pageUrl("/"),
      siteName: site.name,
      type: "website",
      images: [
        { url: pageUrl(site.logoPath), width: 1200, height: 630, alt: `${site.name} OGP` },
      ],
      locale: "ja_JP",
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name}｜${site.tagline}`,
      description: site.description,
      images: [pageUrl(site.logoPath)],
    },
    icons: {
      icon: [
        { url: "/favicon.ico?v=4" },
        { url: "/icon.png", type: "image/png", sizes: "any" },
      ],
      apple: "/icon.png",
      shortcut: "/favicon.ico?v=4",
    },
  }),

  // ページ個別
  page: (key: PageKey, extra?: Partial<Metadata>): Metadata => {
    const p = pages[key];
    return {
      title: p.title,
      description: p.description,
      keywords: Array.from(site.keywords),
      alternates: { canonical: pageUrl(p.path) },
      openGraph: {
        title: p.title,
        description: p.description,
        url: pageUrl(p.path),
        siteName: site.name,
        images: [{ url: ogImage(p.ogImage), width: 1200, height: 630, alt: site.name }],
        locale: "ja_JP",
        type: p.ogType,
      },
      twitter: {
        card: "summary_large_image",
        title: p.title,
        description: p.description,
        images: [ogImage(p.ogImage)],
      },
      ...extra,
    };
  },
};
