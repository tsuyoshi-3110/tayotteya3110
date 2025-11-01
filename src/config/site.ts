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
  name: "株式会社 福源屋",
  tagline: "大阪の美装工事・ビルメンテナンス・内装工事",
  description:
    "大阪の美装工事・ビルメンテナンス・内装工事なら株式会社福源屋へ。清掃・ハウスクリーニング・定期・日常清掃や現場作業員派遣まで対応。",
  keywords: [
    "株式会社福源屋",
    "福源屋",
    "美装工事",
    "ビルメンテナンス",
    "清掃",
    "ハウスクリーニング",
    "定期清掃",
    "内装工事",
    "大阪",
    "関西",
    "交野市",
  ] as const,
  tel: "+81 90-0000-0000",
  logoPath: "/ogpLogo.png",
  googleSiteVerification: "uN73if1NMw0L6lYoLXqKJDBt56lxDXlmbZwfurtPFNs",
  socials: {
    instagram: "",
    line: "",
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
      "株式会社福源屋は2002年創業、大阪府交野市を拠点に関西全域で美装工事・ビルメンテナンス・定期清掃・内装工事を手掛けています。建設現場の美装やマンション・店舗の清掃、ハウスクリーニングなど幅広くご対応可能です。",
  },

  // Stores（/stores）用
  stores: {
    heroTitle: `${site.name} ─ 拠点・事業所一覧`,
    heroAreas: "大阪府交野市・大阪市ほか関西一円",
    heroLead:
      "株式会社福源屋は大阪府交野市の本社を拠点に、関西一円の現場に迅速対応。建設現場の美装工事やビルメンテナンス、店舗・マンションの清掃・ハウスクリーニングまで地域密着型で安心・丁寧なサービスを提供しています。",
    heroTail: "",
    heroIntroLine:
      `${site.name}は大阪府交野市を拠点に、関西全域で美装工事・ビルメンテナンス・清掃を行っています。`,
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
      "大阪府交野市を拠点に、関西一円で対応しております。大阪市・枚方市・寝屋川市・京都府南部なども対応可能です。",
  },
  {
    question: "主な業務内容は？",
    answer:
      "建設現場の美装工事、ビルメンテナンス、定期清掃・日常清掃、ハウスクリーニング、内装工事、現場作業員派遣などを行っています。",
  },
  {
    question: "見積もりは無料ですか？",
    answer: "はい。現地確認を含め、無料でお見積もりいたします。",
  },
  {
    question: "法人契約は可能ですか？",
    answer:
      "はい、対応可能です。マンション管理会社・建設会社・店舗様など、多数の法人取引実績があります。",
  },
  {
    question: "急ぎの清掃依頼にも対応できますか？",
    answer:
      "可能な限り迅速に対応いたします。スケジュール状況により当日対応も承ります。",
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
    title: `${site.name}｜${site.tagline}`,
    description: site.description,
    ogType: "website",
  },
  about: {
    path: "/about",
    title: `会社概要｜${site.name}`,
    description:
      "株式会社福源屋の会社概要ページ。大阪府交野市を拠点に関西一円で美装工事・ビルメンテナンス・清掃・内装工事を行っています。",
    ogType: "website",
  },
  news: {
    path: "/news",
    title: `お知らせ｜${site.name}`,
    description: `${site.name} の最新情報・施工事例・採用情報などをお届けします。`,
    ogType: "website",
  },
  products: {
    path: "/products",
    title: `業務内容一覧｜${site.name}`,
    description:
      `${site.name}の美装工事・ビルメンテナンス・清掃・内装工事などの業務内容一覧をご紹介します。`,
    ogType: "website",
    ogImage: "/ogp-products.jpg",
  },
  projects: {
    path: "/projects",
    title: `施工事例｜${site.name}`,
    description:
      `${site.name}が手掛けた施工・清掃・リフォームなどの実績をご紹介します。`,
    ogType: "website",
  },
  stores: {
    path: "/stores",
    title: `拠点・事業所一覧｜${site.name}`,
    description:
      "株式会社福源屋は大阪府交野市の本社を拠点に関西一円の現場へ迅速対応。ビルメンテナンス・清掃・内装工事など地域密着で展開しています。",
    ogType: "website",
  },
  faq: {
    path: "/faq",
    title: `よくある質問（FAQ）｜${site.name}`,
    description:
      `${site.name}の業務内容・対応エリア・料金・法人契約などに関するよくある質問を掲載しています。`,
    ogType: "article",
  },
  // ✅ 追加：areasLocal（以前の型エラー対策）
  areasLocal: {
    path: "/areas/local",
    title: `大阪府交野市・大阪市の清掃・美装工事｜${site.name}`,
    description:
      "大阪府交野市・大阪市ほか関西一円で、美装工事・ビルメンテナンス・清掃・内装工事のご相談なら株式会社福源屋へ。地域密着で迅速対応。",
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

    verification: site.googleSiteVerification
      ? { google: site.googleSiteVerification }
      : undefined,

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
