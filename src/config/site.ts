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

export const siteName = "お掃除処　たよって屋";

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
  `${site.baseUrl.replace(/\/$/, "")}${
    path.startsWith("/") ? path : `/${path}`
  }`;

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
    heroIntroLine: `${site.name}は大阪府・兵庫県を中心にハウスクリーニング・家事代行・整理収納サービスを提供しています。`,
  },

  /** ローカルエリアページ（/areas/local） */
  areasLocal: {
    // ページ見出し
    h1: "東淀川区の家事代行・ハウスクリーニング",
    lead: "淡路・上新庄・だいどう豊里・井高野・柴島など東淀川区全域に対応。",

    // サービスブロック
    services: [
      {
        title: "家事代行（単発／定期）",
        bullets: [
          "掃除・片付け・洗濯・買い物代行",
          "お子様／高齢者の見守り（家事の範囲内）",
          "女性スタッフ指名可",
        ],
      },
      {
        title: "ハウスクリーニング",
        bullets: [
          "水回り（キッチン・浴室・洗面・トイレ）",
          "エアコンクリーニング",
          "引越し前後・空室クリーニング",
        ],
      },
    ],

    // カバレッジ
    coverageTitle: "対応エリア（東淀川区）",
    coverageBody:
      "淡路・東淡路・菅原・豊新・上新庄・瑞光・小松・南江口・北江口・井高野・大桐・大隅・豊里・大道南・柴島・下新庄 ほか",

    // FAQ（→ 構造化データに流用）
    faq: [
      {
        q: "東淀川区で当日予約は可能ですか？",
        a: "当日の空き状況によっては対応可能です。まずはお問い合わせください。",
      },
      {
        q: "鍵預かりでの不在クリーニングは対応していますか？",
        a: "条件を確認のうえ、鍵管理のルールに基づいて対応します。詳細は事前にご相談ください。",
      },
      {
        q: "当日のお願いは可能ですか？",
        a: "スケジュールに空きがあれば対応いたします。まずはお問い合わせください。",
      },
      {
        q: "鍵預かりや在宅不要の対応は？",
        a: "条件を確認のうえ、適切に管理して対応可能です。",
      },
    ],

    // お問い合わせブロック
    contactTitle: "お問い合わせ",
    contactText:
      "予約状況の確認・見積りは、LINE／メールフォームからお気軽にどうぞ。",

    // 下部ナビ
    toProductsText: "トップページへ",
  },
} as const;

/* =========================
   ★ Footer 用 L10N（追加）
========================= */
export type FooterI18n = {
  cta: string;
  snsAria: string;
  instagramAlt: string;
  lineAlt: string;
  siteAria: string;
  siteAlt: string;
  areaLinkText: string;
  rights: string;
};

/** Footer の多言語テキスト */
export const FOOTER_STRINGS: Record<string, FooterI18n> = {
  ja: {
    cta: "無料相談・お問い合わせ",
    snsAria: "SNSリンク",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "公式サイト",
    siteAlt: site.name, // ← サイト名に追従
    areaLinkText: "東淀川区の家事代行・ハウスクリーニング",
    rights: "All rights reserved.",
  },
  en: {
    cta: "Contact us",
    snsAria: "Social links",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Official website",
    siteAlt: "Tayotteya (Official)",
    areaLinkText: "Housekeeping & house cleaning in local",
    rights: "All rights reserved.",
  },
  zh: {
    cta: "免费咨询・联系",
    snsAria: "社交链接",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "官网",
    siteAlt: "Tayotteya 官方网站",
    areaLinkText: "东淀川区的家政与家居清洁",
    rights: "版权所有。",
  },
  "zh-TW": {
    cta: "免費諮詢・聯絡我們",
    snsAria: "社群連結",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "官方網站",
    siteAlt: "Tayotteya 官方網站",
    areaLinkText: "東淀川區的家事服務・居家清潔",
    rights: "版權所有。",
  },
  ko: {
    cta: "문의하기",
    snsAria: "SNS 링크",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "공식 사이트",
    siteAlt: "Tayotteya 공식",
    areaLinkText: "히가시요도가와구 가사도우미·하우스 클리닝",
    rights: "판권 소유.",
  },
  fr: {
    cta: "Nous contacter",
    snsAria: "Liens sociaux",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Site officiel",
    siteAlt: "Tayotteya (Officiel)",
    areaLinkText: "Ménage & nettoyage domestique à local",
    rights: "Tous droits réservés.",
  },
  es: {
    cta: "Contáctanos",
    snsAria: "Enlaces sociales",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Sitio oficial",
    siteAlt: "Tayotteya (Oficial)",
    areaLinkText: "Servicio doméstico y limpieza en local",
    rights: "Todos los derechos reservados.",
  },
  de: {
    cta: "Kontakt",
    snsAria: "Soziale Links",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Offizielle Website",
    siteAlt: "Tayotteya (Offiziell)",
    areaLinkText: "Haushaltshilfe & Hausreinigung in local",
    rights: "Alle Rechte vorbehalten.",
  },
  pt: {
    cta: "Fale conosco",
    snsAria: "Redes sociais",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Site oficial",
    siteAlt: "Tayotteya (Oficial)",
    areaLinkText: "Serviços domésticos e limpeza em local",
    rights: "Todos os direitos reservados.",
  },
  it: {
    cta: "Contattaci",
    snsAria: "Link social",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Sito ufficiale",
    siteAlt: "Tayotteya (Ufficiale)",
    areaLinkText: "Servizi domestici e pulizie a local",
    rights: "Tutti i diritti riservati.",
  },
  ru: {
    cta: "Связаться с нами",
    snsAria: "Ссылки на соцсети",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Официальный сайт",
    siteAlt: "Tayotteya (Официальный)",
    areaLinkText: "Бытовые услуги и уборка в районе Хигасийодогава",
    rights: "Все права защищены.",
  },
  th: {
    cta: "ติดต่อเรา",
    snsAria: "ลิงก์โซเชียล",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "เว็บไซต์ทางการ",
    siteAlt: "Tayotteya (ทางการ)",
    areaLinkText: "แม่บ้านและทำความสะอาดในเขตฮิกาชิโยโดกาวะ",
    rights: "สงวนลิขสิทธิ์",
  },
  vi: {
    cta: "Liên hệ",
    snsAria: "Liên kết mạng xã hội",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Trang chính thức",
    siteAlt: "Tayotteya (Chính thức)",
    areaLinkText: "Dọn dẹp & giúp việc nhà tại local",
    rights: "Mọi quyền được bảo lưu.",
  },
  id: {
    cta: "Hubungi kami",
    snsAria: "Tautan sosial",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Situs resmi",
    siteAlt: "Tayotteya (Resmi)",
    areaLinkText: "Jasa bersih-bersih & asisten rumah tangga di local",
    rights: "Hak cipta dilindungi.",
  },
  hi: {
    cta: "संपर्क करें",
    snsAria: "सोशल लिंक",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "आधिकारिक वेबसाइट",
    siteAlt: "Tayotteya (आधिकारिक)",
    areaLinkText: "हिगाशी-योदोगावा में हाउसकीपिंग व हाउस क्लीनिंग",
    rights: "सर्वाधिकार सुरक्षित।",
  },
  ar: {
    cta: "اتصل بنا",
    snsAria: "روابط التواصل الاجتماعي",
    instagramAlt: "إنستغرام",
    lineAlt: "لاين",
    siteAria: "الموقع الرسمي",
    siteAlt: "تايوتيّا (رسمي)",
    areaLinkText: "خدمات التدبير المنزلي وتنظيف المنازل في هيغашي يودوغاوا",
    rights: "جميع الحقوق محفوظة.",
  },
};

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
    description: `${site.name}の家事代行・ハウスクリーニングのサービス一覧。水回り清掃や整理整頓、エアコン掃除などを掲載。`,
    ogType: "website",
    ogImage: "/ogp-products.jpg",
  },
  productsEC: {
    path: "/products-ec",
    title: `サービス一覧（オンライン予約）｜${site.name}`,
    description: `${site.name}のサービス一覧（オンライン予約対応）。水回り・キッチン・浴室など日常のお手伝いをプロが丁寧に実施。`,
    ogType: "website",
    ogImage: "/ogp-products.jpg",
  },
  projects: {
    path: "/projects",
    title: `サービス一覧｜${site.name}`,
    description: `${site.name}のサービス紹介ページ。水回り清掃、リビング清掃、整理収納などを写真付きで掲載。`,
    ogType: "website",
  },
  stores: {
    path: "/stores",
    title: `店舗一覧｜${site.name}`,
    description: `${site.name}の店舗一覧ページ。大阪・兵庫エリア対応の拠点情報をご紹介します。`,
    ogType: "website",
  },
  faq: {
    path: "/faq",
    title: `よくある質問（FAQ）｜${site.name}`,
    description: `料金・対応エリア・キャンセル・支払い方法など、${site.name}のハウスクリーニング／家事代行に関するよくある質問。`,
    ogType: "article",
  },
} as const;

export type PageKey = keyof typeof PAGES;
export const pages: Record<PageKey, PageDef> = PAGES as unknown as Record<
  PageKey,
  PageDef
>;

/* =========================
   使い回し Metadata ビルダー
========================= */
export const seo = {
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
        {
          url: pageUrl(site.logoPath),
          width: 1200,
          height: 630,
          alt: `${site.name} OGP`,
        },
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
        images: [
          { url: ogImage(p.ogImage), width: 1200, height: 630, alt: site.name },
        ],
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


export type QA = { q: string; a: string };

// これまで: export function faqToJsonLd(faq: { q: string; a: string }[]) {
export function faqToJsonLd(faq: ReadonlyArray<QA>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
