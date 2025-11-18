/*
 * Refactored /config/site.ts
 * 目的：新規 Pageit 作成時に「最小の上書き」だけで全体が組み上がるようにする。
 * 使い方：
 *   1) SITE_BRAND / SITE_OVERRIDES の値だけを書き換える（店舗名・キャッチ・説明など）
 *   2) 必要なら copy, PAGES の文言や画像パスを調整
 *   3) それ以外は触らずに使い回し可能
 */

import type { Metadata } from "next";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { type AiSiteConfig } from "@/types/AiSite";
import { type FooterI18n } from "@/types/FooterI18n";
import { type FaqItem } from "@/types/FaqItem";
import { type PageDef } from "@/types/PageDef";

/* =========================
   URL / 環境ユーティリティ
========================= */
const ENV_BASE_URL_RAW =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const BASE_URL = ENV_BASE_URL_RAW.replace(/\/$/, "");

function safeHost(input: string, fallback = "localhost:3000"): string {
  try {
    return new URL(input).host;
  } catch {
    return fallback;
  }
}

function safeMetadataBase(input: string): URL | undefined {
  try {
    return new URL(input);
  } catch {
    return undefined;
  }
}

const DOMAIN = safeHost(BASE_URL);
const METADATA_BASE_SAFE = safeMetadataBase(BASE_URL);

/* =========================
   サイト定義ファクトリ（単一情報源）
========================= */
export type SiteOverrides = {
  /** 店舗名（ブランド名） */
  name: string;
  /** キャッチコピー */
  tagline: string;
  /** サイト説明（OG/SEO 共通） */
  description: string;
  /** 検索キーワード */
  keywords: ReadonlyArray<string>;
  /** 代表TEL（任意） */
  tel?: string;
  /** ロゴ/OG既定パス */
  logoPath?: string;
  /** Google Site Verification（任意） */
  googleSiteVerification?: string;
  /** SNS（任意） */
  socials?: Partial<{
    instagram: string;
    line: string;
    x: string;
    facebook: string;
  }>;
  /** baseUrl を個別指定したい場合のみ */
  baseUrl?: string;
};

function createSite(overrides: SiteOverrides) {
  const baseUrl = (overrides.baseUrl ?? BASE_URL).replace(/\/$/, "");
  const domain = safeHost(baseUrl, DOMAIN);
  return {
    key: SITE_KEY,
    domain,
    baseUrl,
    name: overrides.name,
    tagline: overrides.tagline,
    description: overrides.description,
    keywords: overrides.keywords as readonly string[],
    tel: overrides.tel ?? "",
    logoPath: overrides.logoPath ?? "/ogpLogo.png",
    googleSiteVerification: overrides.googleSiteVerification ?? "",
    socials: {
      instagram: overrides.socials?.instagram ?? "",
      line: overrides.socials?.line ?? "",
      x: overrides.socials?.x ?? "",
      facebook: overrides.socials?.facebook ?? "",
    },
  } as const;
}

/* =========================
   ★ 店舗ごとの最小上書き（ここだけ編集）
========================= */
const SITE_BRAND = "D.s.Lab"; // 表示用ブランド名（フル表記）

const SITE_OVERRIDES: SiteOverrides = {
  name: "D.s.Lab",
  tagline: "オリジナル段ボール・梱包資材の企画・製造",
  description:
    "《売り手よし》《買い手よし》《世間よし》三方よしの精神で経営する段ボール・梱包資材ブランド D.s.Lab。作り手の柔軟な発想で【箱】という概念を越え、時代のニーズに合わせたオリジナル段ボールを提案します。創業50年を誇る大光紙工の国内生産原紙・再生率90％以上の段ボールで、「Made in Japan」の品質をお届けします。",
  keywords: [
    "D.s.Lab",
    "ディーズラボ",
    "大光紙工",
    "段ボール",
    "ダンボール",
    "梱包資材",
    "オリジナル箱",
    "オーダーメイド段ボール",
    "エコ包装",
    "大阪",
    "門真市",
  ],
  tel: "+81 72-882-0154",
  logoPath: "/ogpLogo.png",
  googleSiteVerification: "",
  socials: {
    instagram: "",
    line: "",
  },
  baseUrl: "https://d-s-lab-571.shop",
};

/* =========================
   サイト定義（以降は原則編集不要）
========================= */
export const siteName = SITE_BRAND; // 互換：従来の siteName を残す
export const site = createSite(SITE_OVERRIDES);

/* =========================
   住所（公開用）
   ※ ownerAddress は公開しない。SEO/リッチリザルト用にこちらを使う。
========================= */
export type PublicAddress = {
  text: string; // 表示用
  postal: {
    "@type": "PostalAddress";
    addressCountry: "JP";
    addressRegion: string;
    addressLocality: string;
    streetAddress: string;
    postalCode?: string;
  };
  hasMap: string; // Google Maps 検索URL
};
function mapUrlFromText(text: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    text
  )}`;
}

/** 店舗の公開住所（必要に応じてこの値だけ編集） */
export const PUBLIC_ADDRESS: PublicAddress = {
  text: "大阪府門真市北岸和田2-1-12",
  postal: {
    "@type": "PostalAddress",
    addressCountry: "JP",
    addressRegion: "大阪府",
    addressLocality: "門真市",
    streetAddress: "北岸和田2-1-12",
    postalCode: "571-000",
  },
  hasMap: mapUrlFromText("大阪府門真市北岸和田2-1-12"),
};

/* =========================
   便利ヘルパ
========================= */
export const pageUrl = (path = "/") =>
  `${site.baseUrl.replace(/\/$/, "")}${
    path.startsWith("/") ? path : `/${path}`
  }`;

const ogImage = (p?: string) => pageUrl(p ?? site.logoPath);

/* =========================
   コピー（集中管理）★多言語対応
========================= */

export type CopyBundle = {
  home: {
    headline: string;
    description: string;
  };
  stores: {
    heroTitle: string;
    heroAreas: string;
    heroLead: string;
    heroTail: string;
    heroIntroLine: string;
  };
  areasLocal: {
    h1: string;
    lead: string;
    services: {
      title: string;
      bullets: string[];
    }[];
    coverageTitle: string;
    coverageBody: string;
    faq: {
      q: string;
      a: string;
    }[];
    contactTitle: string;
    contactText: string;
    toProductsText: string;
  };
};

/**
 * UI 言語ごとの文言。
 * 例：
 *   const t = copy[uiLang] ?? copy["ja"];
 *   t.home.headline
 */
export const copy: Record<string, CopyBundle> = {
  /* ========= 日本語 ========= */
  ja: {
    home: {
      headline: site.name,
      description:
        "《売り手よし》《買い手よし》《世間よし》三方よしの精神で経営する段ボール・梱包資材ブランド D.s.Lab。作り手の柔軟な発想で【箱】という概念を越え、時代のニーズに合わせたオリジナル段ボールをご提案します。大光紙工の国内生産原紙・再生率90％以上の段ボールで、「Made in Japan」の細やかさと品質をお届けします。",
    },
    stores: {
      heroTitle: `${site.name} ─ 会社案内`,
      heroAreas: "大阪府門真市",
      heroLead:
        "オリジナル段ボール・梱包資材の企画・製造を行う D.s.Lab（大光紙工）。",
      heroTail:
        "小ロットのご相談から大ロットの量産まで、お客様の用途に合わせて柔軟に対応いたします。",
      heroIntroLine:
        "D.s.Lab は大阪府門真市の工場から、全国のお客様へオリジナル段ボール・梱包資材をお届けしています。",
    },
    areasLocal: {
      h1: "大阪府門真市のオリジナル段ボール・梱包資材",
      lead: "自社工場（大阪府門真市北岸和田）から、全国のメーカー・EC事業者・小売業の皆さまへお届けします。",
      services: [
        {
          title: "オリジナル段ボール設計",
          bullets: [
            "商品のサイズや重量に合わせた最適な設計",
            "ギフト用・宅配用など用途別の箱デザイン",
            "小ロットから量産まで柔軟に対応",
          ],
        },
        {
          title: "環境配慮・エコ包装",
          bullets: [
            "再生率90％以上の段ボールを使用",
            "国内生産原紙による安定した品質",
            "過剰包装を抑えた設計提案",
          ],
        },
      ],
      coverageTitle: "対応エリア",
      coverageBody:
        "大阪府門真市を拠点に、関西エリアはもちろん日本全国への出荷に対応しています。",
      faq: [
        {
          q: "最小ロットはどれくらいから対応できますか？",
          a: "サイズや仕様によって異なりますが、小ロットのご相談も承っています。まずはお問い合わせください。",
        },
        {
          q: "納期の目安はどれくらいですか？",
          a: "仕様・数量によりますが、通常はご発注から数週間が目安です。お急ぎの場合もまずはご相談ください。",
        },
        {
          q: "サンプル製作は可能ですか？",
          a: "はい、量産前に形状や強度を確認いただけるサンプル製作が可能です。",
        },
        {
          q: "環境配慮型の素材は選べますか？",
          a: "国内生産の再生原紙を使用し、再生率90％以上の段ボールを採用しています。詳しい仕様はお問い合わせください。",
        },
      ],
      contactTitle: "お問い合わせ",
      contactText:
        "お見積り・仕様のご相談は、メールフォームよりお気軽にお問い合わせください。",
      toProductsText: "商品一覧へ",
    },
  },

  /* ========= 英語 ========= */
  en: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab is a corrugated box and packaging brand operated under the classic Japanese “three-way satisfaction” philosophy: good for the seller, good for the buyer, and good for society. We go beyond the conventional idea of “a box” and design original corrugated packaging that matches the needs of the times. Backed by Daiko Paper Industries’ 50 years of experience, we use domestically produced paper and corrugated board with a recycled content of over 90%.",
    },
    stores: {
      heroTitle: `${site.name} ─ Company profile`,
      heroAreas: "Kadoma, Osaka (Japan)",
      heroLead:
        "D.s.Lab (Daiko Paper Industries) plans and manufactures original corrugated boxes and packaging materials.",
      heroTail:
        "From small lots to mass production, we flexibly respond to your packaging needs.",
      heroIntroLine:
        "Based in Kadoma City, Osaka, D.s.Lab ships original corrugated boxes and packaging materials across Japan.",
    },
    areasLocal: {
      h1: "Original corrugated boxes & packaging from Kadoma, Osaka",
      lead: "From our factory in Kadoma City, Osaka, we serve manufacturers, EC operators and retailers throughout Japan.",
      services: [
        {
          title: "Custom corrugated box design",
          bullets: [
            "Optimized structure for your product size and weight",
            "Gift boxes, shipping boxes and more tailored to each use case",
            "Flexible support from small lots to large-scale production",
          ],
        },
        {
          title: "Eco-friendly packaging proposals",
          bullets: [
            "Corrugated board with over 90% recycled content",
            "Domestically produced paper for stable quality",
            "Packaging design that avoids over-wrapping",
          ],
        },
      ],
      coverageTitle: "Service coverage",
      coverageBody:
        "We are based in Kadoma, Osaka, and can ship nationwide within Japan.",
      faq: [
        {
          q: "What is the minimum order quantity?",
          a: "It depends on size and specifications, but we can also consider small-lot orders. Please contact us for details.",
        },
        {
          q: "What is the typical lead time?",
          a: "Lead time varies depending on the spec and quantity, but a few weeks after order is a general guideline.",
        },
        {
          q: "Can you provide samples?",
          a: "Yes. We can create samples so you can check the shape and strength before mass production.",
        },
        {
          q: "Do you offer eco-friendly materials?",
          a: "We use domestically produced paper and corrugated board with a recycled content ratio of over 90%. Please contact us for detailed specs.",
        },
      ],
      contactTitle: "Contact",
      contactText:
        "For quotations or specification consultations, please feel free to contact us via the inquiry form.",
      toProductsText: "Back to products",
    },
  },

  /* ========= 簡体中文 ========= */
  zh: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab 以日本传统的“三方共赢”（卖方好、买方好、社会好）精神为理念，提供纸箱与包装解决方案。通过灵活的设计思维突破【箱子】的既定概念，根据时代需求提出原创纸箱方案。依托拥有 50 年历史的大光纸工，全部采用日本国内生产的原纸，制造再生率 90％ 以上的瓦楞纸箱，向您提供“Made in Japan”的精细品质。",
    },
    stores: {
      heroTitle: `${site.name} ─ 公司简介`,
      heroAreas: "日本・大阪府门真市",
      heroLead: "提供原创瓦楞纸箱与包装材料的企划与生产。",
      heroTail: "从小批量试制到大批量量产，均可灵活对应您的包装需求。",
      heroIntroLine:
        "D.s.Lab 以大阪府门真市工厂为基地，向日本全国提供原创纸箱及包装材料。",
    },
    areasLocal: {
      h1: "来自大阪门真市的原创纸箱与包装方案",
      lead: "从大阪府门真市北岸和田的工厂出货，为制造业、电商与零售业客户提供服务。",
      services: [
        {
          title: "原创纸箱设计",
          bullets: [
            "根据商品尺寸与重量进行结构设计",
            "礼盒、网购配送箱等多用途设计",
            "支持小批量到大批量生产",
          ],
        },
        {
          title: "环保型包装提案",
          bullets: [
            "使用再生率 90％ 以上的瓦楞纸板",
            "采用日本国内生产的原纸，品质稳定",
            "减少过度包装的环保设计建议",
          ],
        },
      ],
      coverageTitle: "服务范围",
      coverageBody: "以大阪府门真市为基地，可向日本全国发货。",
      faq: [
        {
          q: "最低订购量是多少？",
          a: "视尺寸与规格而定，小批量亦可商议，请先与我们联系。",
        },
        {
          q: "交货周期大约需要多久？",
          a: "根据规格与数量不同，一般从下单到出货约需数周时间，紧急情况也欢迎咨询。",
        },
        {
          q: "是否可以先制作样品？",
          a: "可以，我们可在量产前制作样品，以便确认形状与强度。",
        },
        {
          q: "可以选择环保材料吗？",
          a: "我们使用国内生产的再生原纸，瓦楞纸板再生率 90％ 以上。详细规格欢迎垂询。",
        },
      ],
      contactTitle: "联系我们",
      contactText: "报价与规格咨询，欢迎通过网站表单与我们联系。",
      toProductsText: "返回商品一览",
    },
  },

  /* ========= 繁體中文 ========= */
  "zh-TW": {
    home: {
      headline: site.name,
      description:
        "D.s.Lab 以日本傳統的「三方皆利」（賣方好、買方好、社會好）為理念，提供紙箱與包裝解決方案。以靈活的設計思維打破【紙箱】的既有框架，依照時代需求提出原創紙箱方案。依托擁有 50 年歷史的大光紙工，全部採用日本國產原紙，製造再生率 90％ 以上的瓦楞紙箱，將「Made in Japan」的細緻品質帶給您。",
    },
    stores: {
      heroTitle: `${site.name} ─ 公司簡介`,
      heroAreas: "日本・大阪府門真市",
      heroLead: "提供原創瓦楞紙箱與包裝材料的企劃與製造。",
      heroTail: "從小量試作到大量量產，皆可彈性因應您的包裝需求。",
      heroIntroLine:
        "D.s.Lab 以大阪府門真市的工廠為據點，向日本全國提供原創紙箱與包裝材料。",
    },
    areasLocal: {
      h1: "來自大阪門真市的原創紙箱與包裝方案",
      lead: "從大阪府門真市北岸和田的工廠出貨，服務製造業、電商與零售業等客戶。",
      services: [
        {
          title: "原創紙箱設計",
          bullets: [
            "依商品尺寸與重量進行最佳化結構設計",
            "禮盒、宅配箱等多種用途設計",
            "支援小量到大量生產",
          ],
        },
        {
          title: "環保包裝提案",
          bullets: [
            "使用再生率 90％ 以上的瓦楞紙板",
            "採用日本國產原紙，品質穩定",
            "抑制過度包裝的環保設計建議",
          ],
        },
      ],
      coverageTitle: "服務範圍",
      coverageBody: "以大阪府門真市為據點，可出貨至日本全國。",
      faq: [
        {
          q: "最低訂購量是多少？",
          a: "會依尺寸與規格有所不同，小量訂單亦可商議，歡迎先與我們聯絡。",
        },
        {
          q: "交期大約多久？",
          a: "依規格與數量而定，一般自下單起約需數週，如有急件也請與我們討論。",
        },
        {
          q: "可以先做樣品嗎？",
          a: "可以，我們可於量產前製作樣品，供您確認外型與強度。",
        },
        {
          q: "有環保材質可以選擇嗎？",
          a: "本公司使用國產再生原紙，瓦楞紙板再生率 90％ 以上。詳細規格歡迎洽詢。",
        },
      ],
      contactTitle: "聯絡我們",
      contactText: "如需報價或規格諮詢，歡迎透過網站表單與我們聯絡。",
      toProductsText: "回到商品一覽",
    },
  },

  /* ========= 韓国語 ========= */
  ko: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab 는 ‘판매자에게 좋고, 구매자에게 좋고, 사회에도 좋은’ 삼방선(三方善) 정신을 바탕으로 운영되는 골판지·포장 재료 브랜드입니다. 단순한 ‘박스’의 개념을 넘어 시대의 니즈에 맞춘 오리지널 골판지 포장을 제안합니다. 50년 역사를 지닌 다이코(大光) 제지의 노하우와 일본 국내 생산 원지를 사용하여, 재생 비율 90% 이상인 골판지를 통해 ‘Made in Japan’의 세심한 품질을 제공합니다.",
    },
    stores: {
      heroTitle: `${site.name} ─ 회사 소개`,
      heroAreas: "일본 오사카부 가도마시",
      heroLead:
        "오리지널 골판지 박스와 포장 자재를 기획·제조하는 D.s.Lab(다이코 제지).",
      heroTail:
        "소량 샘플부터 대량 생산까지, 고객의 용도에 맞춰 유연하게 대응합니다.",
      heroIntroLine:
        "D.s.Lab은 오사카부 가도마시에 위치한 공장에서 일본 전역의 고객에게 오리지널 골판지·포장 자재를 공급하고 있습니다.",
    },
    areasLocal: {
      h1: "오사카 가도마시에서 출고되는 오리지널 골판지·포장 자재",
      lead: "오사카부 가도마시 기타키시와다 공장을 거점으로 제조업, EC 사업자, 소매업 고객에게 제품을 제공합니다.",
      services: [
        {
          title: "맞춤형 골판지 설계",
          bullets: [
            "상품 크기와 중량에 최적화된 구조 설계",
            "선물용, 택배용 등 용도별 박스 디자인",
            "소량 주문부터 대량 생산까지 대응",
          ],
        },
        {
          title: "친환경 포장 제안",
          bullets: [
            "재생 비율 90% 이상의 골판지 사용",
            "국내 생산 원지를 사용한 안정적인 품질",
            "과대 포장을 줄이는 설계 제안",
          ],
        },
      ],
      coverageTitle: "대응 지역",
      coverageBody:
        "오사카부 가도마시를 거점으로, 간사이 지역은 물론 일본 전국 발송에 대응합니다.",
      faq: [
        {
          q: "최소 주문 수량(MOQ)은 어느 정도인가요?",
          a: "사이즈와 사양에 따라 다르지만, 소량 상담도 가능하니 먼저 문의해 주세요.",
        },
        {
          q: "납기 일정은 어떻게 되나요?",
          a: "사양·수량에 따라 다르지만, 일반적으로 주문 후 수주(數週)를 기준으로 생각해 주시면 됩니다.",
        },
        {
          q: "샘플 제작이 가능한가요?",
          a: "가능합니다. 양산 전에 형태와 강도를 확인하실 수 있도록 샘플을 제작해 드립니다.",
        },
        {
          q: "환경을 고려한 소재 선택이 가능한가요?",
          a: "국내 생산 재생 원지를 사용하여 재생 비율 90% 이상의 골판지를 사용하고 있습니다. 자세한 사양은 문의해 주세요.",
        },
      ],
      contactTitle: "문의하기",
      contactText:
        "견적 및 사양 상담은 문의 양식을 통해 언제든지 연락해 주세요.",
      toProductsText: "상품 목록으로",
    },
  },

  /* ========= フランス語 ========= */
  fr: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab est une marque de boîtes en carton ondulé et de solutions d’emballage guidée par la philosophie japonaise « gagnant pour le vendeur, gagnant pour l’acheteur, gagnant pour la société ». Nous allons au-delà de la notion classique de « boîte » en proposant des emballages originaux adaptés aux besoins de chaque époque. Forte de 50 ans d’expérience, Daiko Paper Industries utilise des papiers produits au Japon et un carton ondulé contenant plus de 90 % de fibres recyclées, afin d’offrir la qualité « Made in Japan ». ",
    },
    stores: {
      heroTitle: `${site.name} ─ Présentation de l’entreprise`,
      heroAreas: "Kadoma, préfecture d’Osaka (Japon)",
      heroLead:
        "Conception et fabrication de boîtes en carton ondulé et de matériaux d’emballage sur mesure.",
      heroTail:
        "Du petit lot d’essai à la grande série, nous nous adaptons avec souplesse à vos besoins en emballage.",
      heroIntroLine:
        "Depuis notre usine située à Kadoma (Osaka), D.s.Lab fournit des boîtes en carton ondulé et des solutions d’emballage à l’ensemble du Japon.",
    },
    areasLocal: {
      h1: "Boîtes en carton ondulé et emballages sur mesure depuis Kadoma (Osaka)",
      lead: "Notre usine de Kadoma fournit fabricants, boutiques en ligne et commerces de détail dans tout le Japon.",
      services: [
        {
          title: "Conception de boîtes personnalisées",
          bullets: [
            "Structure optimisée selon la taille et le poids de vos produits",
            "Boîtes cadeau, boîtes d’expédition et autres solutions adaptées à chaque usage",
            "Souplesse du petit lot à la grande série",
          ],
        },
        {
          title: "Propositions d’emballages écoresponsables",
          bullets: [
            "Carton ondulé avec plus de 90 % de fibres recyclées",
            "Papiers produits au Japon pour une qualité stable",
            "Conception visant à réduire le suremballage",
          ],
        },
      ],
      coverageTitle: "Zone de couverture",
      coverageBody:
        "Basés à Kadoma (Osaka), nous expédions nos produits dans tout le Japon.",
      faq: [
        {
          q: "Quel est le minimum de commande ?",
          a: "Il dépend de la taille et des spécifications, mais nous pouvons étudier les petites séries. N’hésitez pas à nous consulter.",
        },
        {
          q: "Quel est le délai moyen de livraison ?",
          a: "Selon la spécification et la quantité, comptez généralement quelques semaines après la commande.",
        },
        {
          q: "Pouvez-vous fournir des échantillons ?",
          a: "Oui, nous pouvons produire des échantillons pour vérifier la forme et la résistance avant la production en série.",
        },
        {
          q: "Proposez-vous des matériaux respectueux de l’environnement ?",
          a: "Nous utilisons des papiers produits au Japon et un carton ondulé avec un taux de fibres recyclées supérieur à 90 %. Pour plus de détails, contactez-nous.",
        },
      ],
      contactTitle: "Contact",
      contactText:
        "Pour toute demande de devis ou d’étude de projet, contactez-nous via le formulaire en ligne.",
      toProductsText: "Retour à la liste des produits",
    },
  },

  /* ========= スペイン語 ========= */
  es: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab es una marca de cajas de cartón ondulado y soluciones de embalaje basada en la filosofía japonesa de «beneficio para el vendedor, beneficio para el comprador y beneficio para la sociedad». Vamos más allá del concepto tradicional de «caja» y diseñamos embalajes originales que responden a las necesidades de cada época. Con el respaldo de los 50 años de experiencia de Daiko Paper Industries, utilizamos papel producido en Japón y cartón ondulado con más de un 90 % de contenido reciclado.",
    },
    stores: {
      heroTitle: `${site.name} ─ Información de la empresa`,
      heroAreas: "Kadoma, Osaka (Japón)",
      heroLead:
        "Diseño y fabricación de cajas de cartón ondulado y materiales de embalaje a medida.",
      heroTail:
        "Desde pequeños lotes de prueba hasta grandes tiradas, nos adaptamos de forma flexible a sus necesidades de embalaje.",
      heroIntroLine:
        "Desde nuestra fábrica en Kadoma, Osaka, D.s.Lab suministra cajas de cartón y soluciones de embalaje originales a todo Japón.",
    },
    areasLocal: {
      h1: "Cajas de cartón ondulado y embalajes a medida desde Kadoma (Osaka)",
      lead: "Desde la ciudad de Kadoma, atendemos a fabricantes, tiendas online y comercios minoristas de todo Japón.",
      services: [
        {
          title: "Diseño de cajas personalizadas",
          bullets: [
            "Estructura optimizada según el tamaño y peso del producto",
            "Cajas para regalo, envío y otros usos específicos",
            "Flexibilidad desde pequeños lotes hasta grandes producciones",
          ],
        },
        {
          title: "Propuestas de embalaje ecológico",
          bullets: [
            "Cartón ondulado con más de un 90 % de contenido reciclado",
            "Papel producido en Japón para una calidad estable",
            "Diseños que evitan el sobreembalaje",
          ],
        },
      ],
      coverageTitle: "Cobertura",
      coverageBody:
        "Con base en Kadoma (Osaka), podemos enviar nuestros productos a cualquier punto de Japón.",
      faq: [
        {
          q: "¿Cuál es la cantidad mínima de pedido?",
          a: "Depende del tamaño y las especificaciones, pero también estudiamos pedidos de pequeñas cantidades. Consúltenos.",
        },
        {
          q: "¿Cuál es el plazo de entrega aproximado?",
          a: "Según las especificaciones y la cantidad, el plazo estándar es de unas pocas semanas tras la realización del pedido.",
        },
        {
          q: "¿Pueden suministrar muestras?",
          a: "Sí, podemos fabricar muestras para comprobar la forma y la resistencia antes de la producción en serie.",
        },
        {
          q: "¿Ofrecen materiales ecológicos?",
          a: "Utilizamos papel de producción nacional y cartón ondulado con un contenido reciclado superior al 90 %. Para más detalles, póngase en contacto con nosotros.",
        },
      ],
      contactTitle: "Contacto",
      contactText:
        "Para solicitudes de presupuesto o consultas sobre especificaciones, contáctenos a través del formulario de la web.",
      toProductsText: "Volver a la lista de productos",
    },
  },

  /* ========= ドイツ語 ========= */
  de: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab ist eine Marke für Wellpappkartons und Verpackungslösungen, die sich an der japanischen Philosophie „gut für Verkäufer, gut für Käufer, gut für die Gesellschaft“ orientiert. Wir gehen über den klassischen Begriff der „Schachtel“ hinaus und entwickeln individuelle Verpackungen, die den Anforderungen unserer Zeit entsprechen. Mit 50 Jahren Erfahrung von Daiko Paper Industries setzen wir auf in Japan produzierte Papiere und Wellpappe mit einem Recyclinganteil von über 90 %. ",
    },
    stores: {
      heroTitle: `${site.name} ─ Unternehmensprofil`,
      heroAreas: "Kadoma, Präfektur Osaka (Japan)",
      heroLead:
        "Planung und Herstellung von individuellen Wellpappkartons und Verpackungsmaterialien.",
      heroTail:
        "Vom kleinen Testlos bis zur Großserie reagieren wir flexibel auf Ihre Verpackungsanforderungen.",
      heroIntroLine:
        "Von unserem Werk in Kadoma (Osaka) beliefert D.s.Lab Kunden in ganz Japan mit individuellen Wellpappkartons und Verpackungslösungen.",
    },
    areasLocal: {
      h1: "Individuelle Wellpappkartons und Verpackungen aus Kadoma (Osaka)",
      lead: "Von Kadoma aus beliefern wir Hersteller, Onlinehändler und Einzelhändler in ganz Japan.",
      services: [
        {
          title: "Individuelle Kartonkonstruktionen",
          bullets: [
            "Optimierte Konstruktion für Produktgröße und -gewicht",
            "Geschenkverpackungen, Versandkartons und weitere Lösungen für verschiedene Anwendungen",
            "Flexible Unterstützung von Klein- bis Großserien",
          ],
        },
        {
          title: "Umweltfreundliche Verpackungskonzepte",
          bullets: [
            "Wellpappe mit einem Recyclinganteil von über 90 %",
            "In Japan produzierte Papiere für stabile Qualität",
            "Verpackungsdesigns, die Überverpackung vermeiden",
          ],
        },
      ],
      coverageTitle: "Einsatzgebiet",
      coverageBody:
        "Unser Standort in Kadoma (Osaka) ermöglicht den Versand in ganz Japan.",
      faq: [
        {
          q: "Wie hoch ist die Mindestbestellmenge?",
          a: "Das hängt von Größe und Spezifikation ab, wir prüfen jedoch auch Kleinserien. Bitte kontaktieren Sie uns.",
        },
        {
          q: "Wie lang ist die übliche Lieferzeit?",
          a: "Je nach Spezifikation und Menge beträgt sie in der Regel einige Wochen nach Auftragseingang.",
        },
        {
          q: "Können Muster bereitgestellt werden?",
          a: "Ja, wir fertigen Muster an, damit Sie Form und Stabilität vor der Serienproduktion prüfen können.",
        },
        {
          q: "Bieten Sie umweltfreundliche Materialien an?",
          a: "Wir verwenden in Japan produzierte Papiere und Wellpappe mit einem Recyclinganteil von über 90 %. Für Details kontaktieren Sie uns bitte.",
        },
      ],
      contactTitle: "Kontakt",
      contactText:
        "Für Angebotsanfragen oder technische Rückfragen kontaktieren Sie uns bitte über das Online-Formular.",
      toProductsText: "Zur Produktübersicht",
    },
  },

  /* ========= ポルトガル語 ========= */
  pt: {
    home: {
      headline: site.name,
      description:
        "A D.s.Lab é uma marca de caixas de papelão ondulado e soluções de embalagens baseada na filosofia japonesa de “bom para quem vende, bom para quem compra e bom para a sociedade”. Vamos além do conceito tradicional de “caixa” e criamos embalagens originais que acompanham as necessidades do mercado. Com o apoio de 50 anos de experiência da Daiko Paper Industries, utilizamos papel produzido no Japão e papelão ondulado com mais de 90% de conteúdo reciclado.",
    },
    stores: {
      heroTitle: `${site.name} ─ Sobre a empresa`,
      heroAreas: "Kadoma, Osaka (Japão)",
      heroLead:
        "Planejamento e fabricação de caixas de papelão ondulado e materiais de embalagem sob medida.",
      heroTail:
        "Do pequeno lote de teste à produção em grande escala, atendemos de forma flexível às suas necessidades de embalagem.",
      heroIntroLine:
        "A partir de nossa fábrica em Kadoma, Osaka, a D.s.Lab fornece caixas de papelão ondulado e soluções de embalagem originais para todo o Japão.",
    },
    areasLocal: {
      h1: "Caixas de papelão ondulado e embalagens sob medida a partir de Kadoma (Osaka)",
      lead: "Nossa fábrica em Kadoma atende fabricantes, lojas virtuais e varejistas em todo o Japão.",
      services: [
        {
          title: "Design de caixas personalizadas",
          bullets: [
            "Estrutura otimizada de acordo com o tamanho e o peso do produto",
            "Caixas para presentes, envio e outras aplicações",
            "Atendimento flexível de pequenos lotes a grandes produções",
          ],
        },
        {
          title: "Propostas de embalagens ecológicas",
          bullets: [
            "Papelão ondulado com mais de 90% de conteúdo reciclado",
            "Papéis produzidos no Japão para qualidade estável",
            "Projetos que evitam o excesso de embalagem",
          ],
        },
      ],
      coverageTitle: "Abrangência",
      coverageBody:
        "Com base em Kadoma (Osaka), enviamos nossos produtos para todo o Japão.",
      faq: [
        {
          q: "Qual é o pedido mínimo?",
          a: "Depende do tamanho e da especificação, mas também avaliamos pequenos lotes. Entre em contato para mais detalhes.",
        },
        {
          q: "Qual é o prazo médio de entrega?",
          a: "De acordo com a especificação e a quantidade, o prazo padrão é de algumas semanas após o pedido.",
        },
        {
          q: "Vocês fornecem amostras?",
          a: "Sim. Podemos produzir amostras para que você verifique o formato e a resistência antes da produção em série.",
        },
        {
          q: "Vocês trabalham com materiais ecológicos?",
          a: "Utilizamos papéis produzidos no Japão e papelão ondulado com conteúdo reciclado superior a 90%. Para detalhes, entre em contato.",
        },
      ],
      contactTitle: "Fale conosco",
      contactText:
        "Para orçamentos ou consultas técnicas, fale conosco pelo formulário do site.",
      toProductsText: "Voltar à lista de produtos",
    },
  },

  /* ========= イタリア語 ========= */
  it: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab è un marchio di scatole in cartone ondulato e soluzioni di imballaggio ispirato alla filosofia giapponese del “triplo vantaggio”: buono per chi vende, buono per chi compra e buono per la società. Andiamo oltre il semplice concetto di “scatola” progettando imballaggi originali che rispondono alle esigenze del mercato. Forte di 50 anni di esperienza di Daiko Paper Industries, utilizziamo carta prodotta in Giappone e cartone ondulato con oltre il 90% di contenuto riciclato.",
    },
    stores: {
      heroTitle: `${site.name} ─ Profilo aziendale`,
      heroAreas: "Kadoma, Osaka (Giappone)",
      heroLead:
        "Progettazione e produzione di scatole in cartone ondulato e materiali di imballaggio su misura.",
      heroTail:
        "Dai piccoli lotti di prova alla produzione su larga scala, ci adattiamo in modo flessibile alle vostre esigenze.",
      heroIntroLine:
        "Dalla nostra fabbrica di Kadoma, Osaka, D.s.Lab fornisce scatole e soluzioni di imballaggio originali in tutto il Giappone.",
    },
    areasLocal: {
      h1: "Scatole in cartone ondulato e imballaggi su misura da Kadoma (Osaka)",
      lead: "La nostra fabbrica a Kadoma serve produttori, operatori e-commerce e rivenditori in tutto il Giappone.",
      services: [
        {
          title: "Progettazione di scatole personalizzate",
          bullets: [
            "Struttura ottimizzata in base a dimensioni e peso del prodotto",
            "Scatole regalo, da spedizione e altre applicazioni",
            "Flessibilità dai piccoli lotti alle grandi tirature",
          ],
        },
        {
          title: "Proposte di imballaggi ecosostenibili",
          bullets: [
            "Cartone ondulato con oltre il 90% di materiale riciclato",
            "Carta prodotta in Giappone per una qualità costante",
            "Progetti che riducono il sovra-imballaggio",
          ],
        },
      ],
      coverageTitle: "Area di servizio",
      coverageBody:
        "Con sede a Kadoma (Osaka), spediamo prodotti in tutto il Giappone.",
      faq: [
        {
          q: "Qual è il quantitativo minimo d’ordine?",
          a: "Dipende da dimensioni e specifiche, ma valutiamo anche piccoli lotti. Contattateci per maggiori dettagli.",
        },
        {
          q: "Quali sono i tempi medi di consegna?",
          a: "In base a specifiche e quantità, generalmente alcune settimane dall’ordine.",
        },
        {
          q: "Potete fornire dei campioni?",
          a: "Sì, possiamo realizzare campioni per verificare forma e resistenza prima della produzione in serie.",
        },
        {
          q: "Offrite materiali eco-compatibili?",
          a: "Utilizziamo carta prodotta in Giappone e cartone ondulato con oltre il 90% di contenuto riciclato. Contattateci per i dettagli tecnici.",
        },
      ],
      contactTitle: "Contattaci",
      contactText:
        "Per richieste di preventivo o consulenze tecniche, scrivici tramite il modulo del sito.",
      toProductsText: "Torna all’elenco prodotti",
    },
  },

  /* ========= ロシア語 ========= */
  ru: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab — это бренд гофрокартона и упаковочных решений, построенный на японской философии «выгода для продавца, выгода для покупателя, выгода для общества». Мы выходим за рамки привычного представления о «коробке», создавая оригинальные виды упаковки, соответствующие требованиям времени. Используя опыт компании Daiko Paper Industries, накопленный за 50 лет, мы применяем бумагу японского производства и гофрокартон с долей переработанного сырья более 90%.",
    },
    stores: {
      heroTitle: `${site.name} ─ О компании`,
      heroAreas: "Кадома, префектура Осака (Япония)",
      heroLead:
        "Проектирование и производство индивидуальных гофрокартонных коробок и упаковочных материалов.",
      heroTail:
        "От небольших пробных партий до крупносерийного производства — мы гибко подстраиваемся под ваши задачи.",
      heroIntroLine:
        "Из нашего завода в городе Кадома (Осака) D.s.Lab поставляет оригинальные коробки и упаковочные решения по всей Японии.",
    },
    areasLocal: {
      h1: "Индивидуальные коробки из гофрокартона и упаковка из Кадомы (Осака)",
      lead: "Наш завод в Кадоме обслуживает производителей, интернет-магазины и розничные сети по всей Японии.",
      services: [
        {
          title: "Проектирование индивидуальных коробок",
          bullets: [
            "Оптимальная конструкция с учётом размеров и веса продукции",
            "Подарочные коробки, транспортная упаковка и другие решения",
            "Гибкая поддержка от малых до крупных партий",
          ],
        },
        {
          title: "Экологичные варианты упаковки",
          bullets: [
            "Гофрокартон с долей переработанного сырья более 90 %",
            "Бумага японского производства и стабильное качество",
            "Конструкции, позволяющие избежать избыточной упаковки",
          ],
        },
      ],
      coverageTitle: "География поставок",
      coverageBody:
        "Базируясь в Кадоме (Осака), мы поставляем продукцию по всей территории Японии.",
      faq: [
        {
          q: "Каков минимальный объём заказа?",
          a: "Он зависит от размера и характеристик изделия, но мы рассматриваем и небольшие партии. Пожалуйста, свяжитесь с нами для уточнения.",
        },
        {
          q: "Каковы ориентировочные сроки поставки?",
          a: "В зависимости от характеристик и объёма заказа, обычно это несколько недель после оформления заказа.",
        },
        {
          q: "Можно ли получить образцы?",
          a: "Да, мы можем изготовить образцы для проверки формы и прочности до начала серийного производства.",
        },
        {
          q: "Предлагаете ли вы экологичные материалы?",
          a: "Мы используем бумагу японского производства и гофрокартон с долей переработанного сырья более 90 %. Для подробностей свяжитесь с нами.",
        },
      ],
      contactTitle: "Связаться с нами",
      contactText:
        "Для получения предложения или консультации по спецификациям воспользуйтесь формой обратной связи на сайте.",
      toProductsText: "К списку продукции",
    },
  },

  /* ========= タイ語 ========= */
  th: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab เป็นแบรนด์กล่องกระดาษลูกฟูกและโซลูชันบรรจุภัณฑ์ที่ดำเนินธุรกิจด้วยแนวคิดญี่ปุ่นแบบ “สามฝ่ายได้ประโยชน์” คือ ดีต่อผู้ขาย ดีต่อผู้ซื้อ และดีต่อสังคม เราออกแบบบรรจุภัณฑ์ดั้งเดิมที่ก้าวข้ามกรอบคำว่า “กล่อง” ให้ตอบโจทย์ยุคสมัย โดยใช้ประสบการณ์กว่า 50 ปีของ Daiko Paper Industries และกระดาษที่ผลิตในญี่ปุ่นบนพื้นฐานกระดาษรีไซเคิลมากกว่า 90%.",
    },
    stores: {
      heroTitle: `${site.name} ─ ข้อมูลบริษัท`,
      heroAreas: "เมืองคะโดะมะ จังหวัดโอซาก้า (ญี่ปุ่น)",
      heroLead:
        "ออกแบบและผลิตกล่องกระดาษลูกฟูกและวัสดุบรรจุภัณฑ์ตามสั่ง.",
      heroTail:
        "รองรับตั้งแต่ล็อตทดลองจำนวนน้อยไปจนถึงการผลิตจำนวนมากอย่างยืดหยุ่นตามความต้องการ.",
      heroIntroLine:
        "จากโรงงานในเมืองคะโดะมะ จังหวัดโอซาก้า D.s.Lab จัดส่งกล่องกระดาษและโซลูชันบรรจุภัณฑ์ไปทั่วประเทศญี่ปุ่น.",
    },
    areasLocal: {
      h1: "กล่องลูกฟูกและบรรจุภัณฑ์สั่งทำจากคะโดะมะ (โอซาก้า)",
      lead: "โรงงานของเราที่คะโดะมะให้บริการผู้ผลิต ร้านค้าออนไลน์ และร้านค้าปลีกทั่วประเทศญี่ปุ่น.",
      services: [
        {
          title: "ออกแบบกล่องตามสั่ง",
          bullets: [
            "โครงสร้างกล่องที่เหมาะสมกับขนาดและน้ำหนักสินค้า",
            "กล่องของขวัญ กล่องส่งของ และแบบอื่น ๆ ตามการใช้งาน",
            "ยืดหยุ่นตั้งแต่ล็อตเล็กจนถึงการผลิตจำนวนมาก",
          ],
        },
        {
          title: "ข้อเสนอด้านบรรจุภัณฑ์รักษ์สิ่งแวดล้อม",
          bullets: [
            "ใช้กระดาษลูกฟูกที่มีสัดส่วนรีไซเคิลมากกว่า 90%",
            "ใช้กระดาษผลิตในญี่ปุ่นเพื่อคุณภาพที่มั่นคง",
            "ออกแบบเพื่อลดการใช้บรรจุภัณฑ์เกินความจำเป็น",
          ],
        },
      ],
      coverageTitle: "พื้นที่ให้บริการ",
      coverageBody:
        "มีฐานการผลิตที่คะโดะมะ (โอซาก้า) และสามารถจัดส่งสินค้าได้ทั่วประเทศญี่ปุ่น.",
      faq: [
        {
          q: "ปริมาณสั่งซื้อขั้นต่ำเท่าไร?",
          a: "ขึ้นอยู่กับขนาดและสเปกของกล่อง แต่สามารถพูดคุยเรื่องล็อตเล็กได้ โปรดติดต่อเรา.",
        },
        {
          q: "ระยะเวลาจัดส่งโดยประมาณกี่วัน?",
          a: "แล้วแต่สเปกและจำนวน โดยทั่วไปใช้เวลาหลังสั่งซื้อไม่กี่สัปดาห์ หากเร่งด่วนสามารถสอบถามเพิ่มเติมได้.",
        },
        {
          q: "สามารถทำตัวอย่างก่อนผลิตจริงได้หรือไม่?",
          a: "ได้ เราสามารถทำตัวอย่างเพื่อให้ตรวจสอบรูปทรงและความแข็งแรงก่อนการผลิตจริง.",
        },
        {
          q: "มีตัวเลือกวัสดุที่เป็นมิตรต่อสิ่งแวดล้อมหรือไม่?",
          a: "เราใช้กระดาษที่ผลิตในญี่ปุ่นและกระดาษลูกฟูกที่มีสัดส่วนรีไซเคิลมากกว่า 90% หากต้องการข้อมูลรายละเอียด โปรดติดต่อเรา.",
        },
      ],
      contactTitle: "ติดต่อเรา",
      contactText:
        "หากต้องการขอใบเสนอราคาหรือปรึกษาสเปกสินค้า กรุณาติดต่อผ่านแบบฟอร์มบนเว็บไซต์.",
      toProductsText: "กลับไปยังหน้าสินค้า",
    },
  },

  /* ========= ベトナム語 ========= */
  vi: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab là thương hiệu hộp carton sóng và giải pháp bao bì được vận hành theo triết lý Nhật Bản “ba bên cùng có lợi”: tốt cho người bán, tốt cho người mua và tốt cho xã hội. Chúng tôi vượt qua khái niệm “chiếc hộp” thông thường để tạo ra các giải pháp bao bì độc đáo, phù hợp với xu hướng thời đại. Dựa trên 50 năm kinh nghiệm của Daiko Paper Industries, chúng tôi sử dụng giấy sản xuất tại Nhật và carton với tỷ lệ tái chế trên 90%.",
    },
    stores: {
      heroTitle: `${site.name} ─ Giới thiệu công ty`,
      heroAreas: "Thành phố Kadoma, Osaka (Nhật Bản)",
      heroLead:
        "Thiết kế và sản xuất hộp carton sóng và vật liệu bao bì theo yêu cầu.",
      heroTail:
        "Từ lô thử nghiệm nhỏ đến sản xuất hàng loạt, chúng tôi linh hoạt đáp ứng mọi nhu cầu bao bì.",
      heroIntroLine:
        "Từ nhà máy tại Kadoma, Osaka, D.s.Lab cung cấp hộp carton và giải pháp bao bì độc đáo đến khắp Nhật Bản.",
    },
    areasLocal: {
      h1: "Hộp carton sóng & bao bì theo yêu cầu từ Kadoma (Osaka)",
      lead: "Nhà máy tại Kadoma phục vụ các nhà sản xuất, đơn vị thương mại điện tử và bán lẻ trên khắp Nhật Bản.",
      services: [
        {
          title: "Thiết kế hộp theo yêu cầu",
          bullets: [
            "Kết cấu tối ưu theo kích thước và trọng lượng sản phẩm",
            "Hộp quà tặng, hộp vận chuyển và nhiều kiểu dáng khác",
            "Linh hoạt từ lô nhỏ đến sản xuất hàng loạt",
          ],
        },
        {
          title: "Giải pháp bao bì thân thiện môi trường",
          bullets: [
            "Carton sóng với tỷ lệ tái chế trên 90%",
            "Giấy sản xuất tại Nhật cho chất lượng ổn định",
            "Thiết kế giảm thiểu bao bì dư thừa",
          ],
        },
      ],
      coverageTitle: "Khu vực phục vụ",
      coverageBody:
        "Trụ sở tại Kadoma (Osaka) với khả năng giao hàng đi khắp Nhật Bản.",
      faq: [
        {
          q: "Số lượng đặt hàng tối thiểu là bao nhiêu?",
          a: "Tùy thuộc kích thước và thông số, chúng tôi cũng cân nhắc các đơn hàng lô nhỏ. Hãy liên hệ để được tư vấn.",
        },
        {
          q: "Thời gian giao hàng dự kiến là bao lâu?",
          a: "Theo thông số và số lượng, thông thường là vài tuần sau khi đặt hàng.",
        },
        {
          q: "Có thể yêu cầu làm mẫu trước không?",
          a: "Có. Chúng tôi có thể làm mẫu để bạn kiểm tra hình dáng và độ bền trước khi sản xuất hàng loạt.",
        },
        {
          q: "Có lựa chọn vật liệu thân thiện môi trường không?",
          a: "Chúng tôi sử dụng giấy sản xuất tại Nhật và carton với tỷ lệ tái chế trên 90%. Vui lòng liên hệ để biết chi tiết.",
        },
      ],
      contactTitle: "Liên hệ",
      contactText:
        "Để yêu cầu báo giá hoặc tư vấn kỹ thuật, vui lòng liên hệ qua biểu mẫu trên website.",
      toProductsText: "Quay lại danh sách sản phẩm",
    },
  },

  /* ========= インドネシア語 ========= */
  id: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab adalah merek kotak karton bergelombang dan solusi kemasan yang dijalankan dengan filosofi Jepang “tiga pihak diuntungkan”: baik bagi penjual, baik bagi pembeli, dan baik bagi masyarakat. Kami melampaui konsep tradisional “kotak” dengan merancang kemasan orisinal yang mengikuti kebutuhan zaman. Berbekal pengalaman lebih dari 50 tahun Daiko Paper Industries, kami menggunakan kertas produksi Jepang dan karton bergelombang dengan kandungan daur ulang lebih dari 90%.",
    },
    stores: {
      heroTitle: `${site.name} ─ Profil perusahaan`,
      heroAreas: "Kota Kadoma, Osaka (Jepang)",
      heroLead:
        "Perencanaan dan produksi kotak karton bergelombang serta material kemasan sesuai pesanan.",
      heroTail:
        "Mulai dari lot percobaan kecil hingga produksi massal, kami merespons kebutuhan kemasan Anda secara fleksibel.",
      heroIntroLine:
        "Dari pabrik kami di Kadoma, Osaka, D.s.Lab memasok kotak karton dan solusi kemasan orisinal ke seluruh Jepang.",
    },
    areasLocal: {
      h1: "Kotak karton bergelombang & kemasan custom dari Kadoma (Osaka)",
      lead: "Pabrik kami di Kadoma melayani produsen, pelaku e-commerce, dan ritel di seluruh Jepang.",
      services: [
        {
          title: "Desain kotak custom",
          bullets: [
            "Struktur dioptimalkan sesuai ukuran dan berat produk",
            "Kotak hadiah, kotak pengiriman, dan berbagai penggunaan lainnya",
            "Fleksibel dari lot kecil hingga produksi besar",
          ],
        },
        {
          title: "Usulan kemasan ramah lingkungan",
          bullets: [
            "Karton bergelombang dengan kandungan daur ulang lebih dari 90%",
            "Kertas produksi Jepang dengan kualitas stabil",
            "Desain yang mengurangi kemasan berlebihan",
          ],
        },
      ],
      coverageTitle: "Area layanan",
      coverageBody:
        "Berbasis di Kadoma (Osaka) dengan pengiriman ke seluruh Jepang.",
      faq: [
        {
          q: "Berapa jumlah pesanan minimum?",
          a: "Tergantung ukuran dan spesifikasi. Kami juga dapat mempertimbangkan lot kecil, silakan hubungi kami.",
        },
        {
          q: "Berapa perkiraan waktu produksi/pengiriman?",
          a: "Bergantung spesifikasi dan kuantitas, umumnya beberapa minggu setelah pemesanan.",
        },
        {
          q: "Apakah bisa dibuatkan sampel terlebih dahulu?",
          a: "Bisa. Kami dapat membuat sampel untuk mengecek bentuk dan kekuatan sebelum produksi massal.",
        },
        {
          q: "Apakah tersedia material yang ramah lingkungan?",
          a: "Kami menggunakan kertas produksi Jepang dan karton bergelombang dengan kandungan daur ulang > 90%. Untuk detail, silakan hubungi kami.",
        },
      ],
      contactTitle: "Hubungi kami",
      contactText:
        "Untuk permintaan penawaran atau konsultasi spesifikasi, silakan hubungi kami melalui formulir di situs.",
      toProductsText: "Kembali ke daftar produk",
    },
  },

  /* ========= ヒンディー語 ========= */
  hi: {
    home: {
      headline: site.name,
      description:
        "D.s.Lab एक गत्ते (कुर्रुगेटेड बॉक्स) और पैकेजिंग समाधान का ब्रांड है, जो जापानी ‘तीन-तरफ़ा लाभ’ की सोच पर आधारित है — बेचने वाले के लिए अच्छा, खरीदने वाले के लिए अच्छा और समाज के लिए अच्छा। हम सामान्य ‘डिब्बे’ की धारणा से आगे बढ़कर, समय की ज़रूरतों के अनुरूप मौलिक पैकेजिंग डिज़ाइन करते हैं। Daiko Paper Industries के 50 वर्षों के अनुभव के साथ, हम जापान में निर्मित कागज़ और 90% से अधिक रीसायकल सामग्री वाले गत्ते का उपयोग करते हैं।",
    },
    stores: {
      heroTitle: `${site.name} ─ कंपनी प्रोफ़ाइल`,
      heroAreas: "कडोमा, ओसाका (जापान)",
      heroLead:
        "ऑर्डर के अनुसार कुर्रुगेटेड बॉक्स और पैकेजिंग मटेरियल की डिज़ाइन व मैन्युफैक्चरिंग।",
      heroTail:
        "छोटे ट्रायल लॉट से लेकर बड़े पैमाने की उत्पादन तक, हम आपकी पैकेजिंग ज़रूरतों के अनुसार लचीलापन दिखाते हैं।",
      heroIntroLine:
        "कडोमा (ओसाका) स्थित हमारे प्लांट से D.s.Lab पूरे जापान में मौलिक गत्ते के बॉक्स और पैकेजिंग समाधान सप्लाई करता है।",
    },
    areasLocal: {
      h1: "कडोमा (ओसाका) से कस्टम गत्ते के बॉक्स और पैकेजिंग",
      lead: "हमारा प्लांट कडोमा से पूरे जापान के मैन्युफैक्चरर, ई-कॉमर्स और रिटेल ग्राहकों को सप्लाई करता है।",
      services: [
        {
          title: "कस्टम बॉक्स डिज़ाइन",
          bullets: [
            "प्रोडक्ट के आकार और वज़न के अनुसार ऑप्टिमाइज़्ड स्ट्रक्चर",
            "गिफ्ट बॉक्स, शिपिंग बॉक्स व अन्य उपयोगों के लिए डिज़ाइन",
            "छोटे लॉट से लेकर बड़े उत्पादन तक लचीला सपोर्ट",
          ],
        },
        {
          title: "पर्यावरण-अनुकूल पैकेजिंग प्रस्ताव",
          bullets: [
            "90% से अधिक रीसायकल कंटेंट वाला गत्ता",
            "जापान में निर्मित कागज़ से स्थिर गुणवत्ता",
            "ओवर-पैकेजिंग कम करने वाले डिज़ाइन प्रस्ताव",
          ],
        },
      ],
      coverageTitle: "सेवा क्षेत्र",
      coverageBody:
        "कडोमा (ओसाका) को आधार बनाते हुए, हम पूरे जापान में सप्लाई कर सकते हैं।",
      faq: [
        {
          q: "मिनिमम ऑर्डर क्वांटिटी (MOQ) क्या है?",
          a: "यह साइज और स्पेसिफिकेशन पर निर्भर करता है। छोटे लॉट के लिए भी हम सलाह-मशविरा कर सकते हैं, कृपया संपर्क करें।",
        },
        {
          q: "डिलीवरी का अनुमानित समय कितना होता है?",
          a: "स्पेसिफिकेशन और मात्रा के अनुसार, सामान्यतः ऑर्डर के बाद कुछ सप्ताह का समय लगता है।",
        },
        {
          q: "क्या पहले सैंपल बनवाना संभव है?",
          a: "हाँ, हम मास प्रोडक्शन से पहले सैंपल तैयार कर सकते हैं ताकि आप आकार और मज़बूती की जाँच कर सकें।",
        },
        {
          q: "क्या पर्यावरण-अनुकूल सामग्री उपलब्ध है?",
          a: "हम जापान में बने कागज़ और 90% से अधिक रीसायकल कंटेंट वाले गत्ते का उपयोग करते हैं। विस्तृत जानकारी के लिए कृपया संपर्क करें।",
        },
      ],
      contactTitle: "संपर्क करें",
      contactText:
        "कोटेशन या स्पेसिफिकेशन परामर्श के लिए वेबसाइट के संपर्क फ़ॉर्म के माध्यम से हमसे जुड़ें।",
      toProductsText: "प्रोडक्ट सूची पर लौटें",
    },
  },

  /* ========= アラビア語 ========= */
  ar: {
    home: {
      headline: site.name,
      description:
        "تُعد D.s.Lab علامة تجارية متخصصة في صناديق الكرتون المضلع وحلول التغليف، وتستند في إدارتها إلى الفلسفة اليابانية «المنفعة للبائع، والمنفعة للمشتري، والمنفعة للمجتمع». نتجاوز المفهوم التقليدي لـ «الصندوق» من خلال تصميم حلول تغليف أصلية تواكب متطلبات العصر. بالاستفادة من خبرة شركة Daiko Paper Industries الممتدة لأكثر من 50 عامًا، نستخدم ورقًا مُنتَجًا في اليابان وكرتونًا متموجًا يحتوي على أكثر من 90٪ من المواد المعاد تدويرها.",
    },
    stores: {
      heroTitle: `${site.name} ─ نبذة عن الشركة`,
      heroAreas: "مدينة كادوما، أوساكا (اليابان)",
      heroLead:
        "تصميم وتصنيع صناديق الكرتون المضلع ومواد التغليف حسب الطلب.",
      heroTail:
        "بدءًا من الدفعات التجريبية الصغيرة وحتى الإنتاج الكمي، نستجيب لاحتياجاتكم في التغليف بكل مرونة.",
      heroIntroLine:
        "من مصنعنا في كادوما (أوساكا)، تقوم D.s.Lab بتوريد صناديق كرتون مضلع وحلول تغليف مبتكرة إلى جميع أنحاء اليابان.",
    },
    areasLocal: {
      h1: "صناديق كرتون مضلع وتغليف مخصص من كادوما (أوساكا)",
      lead: "يخدم مصنعنا في كادوما الشركات المصنعة، ومتاجر التجارة الإلكترونية، وتجار التجزئة في جميع أنحاء اليابان.",
      services: [
        {
          title: "تصميم صناديق مخصصة",
          bullets: [
            "تصميم هيكل مُحسَّن وفقًا لحجم المنتج ووزنه",
            "صناديق هدايا، وصناديق شحن، وغيرها من الاستخدامات",
            "مرونة في التعامل مع الطلبات الصغيرة والكبيرة",
          ],
        },
        {
          title: "مقترحات تغليف صديقة للبيئة",
          bullets: [
            "استخدام كرتون مضلع يحتوي على أكثر من 90٪ من المواد المعاد تدويرها",
            "ورق مُنتج في اليابان لضمان جودة مستقرة",
            "تصاميم تقلل من فرط استخدام مواد التغليف",
          ],
        },
      ],
      coverageTitle: "نطاق الخدمة",
      coverageBody:
        "نحن موجودون في كادوما (أوساكا) ونستطيع الشحن إلى أي منطقة داخل اليابان.",
      faq: [
        {
          q: "ما هي أقل كمية يمكن طلبها؟",
          a: "يعتمد ذلك على الحجم والمواصفات، لكن يمكننا دراسة الطلبات ذات الكميات القليلة. يُرجى التواصل معنا للتفاصيل.",
        },
        {
          q: "ما هو الزمن التقريبي للتسليم؟",
          a: "وفقًا للمواصفات والكمية، يكون الزمن المعتاد بضع أسابيع بعد تأكيد الطلب.",
        },
        {
          q: "هل يمكن الحصول على عيّنات قبل الإنتاج الكمي؟",
          a: "نعم، يمكننا إنتاج عيّنات للتحقق من الشكل والقوة قبل بدء الإنتاج الكمي.",
        },
        {
          q: "هل تتوفر خيارات مواد صديقة للبيئة؟",
          a: "نستخدم ورقًا مُنتَجًا في اليابان وكرتونًا مضلعًا بنسبة عالية من المواد المعاد تدويرها (أكثر من 90٪). لمزيد من التفاصيل، نرجو التواصل معنا.",
        },
      ],
      contactTitle: "اتصل بنا",
      contactText:
        "لطلب عرض سعر أو استشارة فنية، يُرجى استخدام نموذج التواصل على الموقع.",
      toProductsText: "العودة إلى قائمة المنتجات",
    },
  },
};

/* =========================
   Footer L10N（サイト名は自動追従）
========================= */
function footerAlt(name: string) {
  return name || "Official Website";
}

/** Footer の多言語テキスト */
export const FOOTER_STRINGS: Record<string, FooterI18n> = {
  ja: {
    cta: "無料相談・お問い合わせ",
    snsAria: "SNSリンク",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "公式サイト",
    siteAlt: footerAlt(site.name),
    areaLinkText: "大阪府門真市の段ボール・梱包資材 D.s.Lab",
    rights: "All rights reserved.",
  },
  en: {
    cta: "Contact us",
    snsAria: "Social links",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Official website",
    siteAlt: footerAlt(site.name),
    areaLinkText: "Corrugated boxes & packaging from Kadoma, Osaka",
    rights: "All rights reserved.",
  },
  zh: {
    cta: "免费咨询・联系",
    snsAria: "社交链接",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "官网",
    siteAlt: footerAlt(site.name),
    areaLinkText: "大阪门真市的纸箱与包装解决方案",
    rights: "版权所有。",
  },
  "zh-TW": {
    cta: "免費諮詢・聯絡我們",
    snsAria: "社群連結",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "官方網站",
    siteAlt: footerAlt(site.name),
    areaLinkText: "大阪門真市的紙箱・包裝解決方案",
    rights: "版權所有。",
  },
  ko: {
    cta: "문의하기",
    snsAria: "SNS 링크",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "공식 사이트",
    siteAlt: footerAlt(site.name),
    areaLinkText: "오사카 가도마의 골판지·포장 자재 D.s.Lab",
    rights: "판권 소유.",
  },
  fr: {
    cta: "Nous contacter",
    snsAria: "Liens sociaux",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Site officiel",
    siteAlt: footerAlt(site.name),
    areaLinkText: "Boîtes en carton & emballages depuis Kadoma (Osaka)",
    rights: "Tous droits réservés.",
  },
  es: {
    cta: "Contáctanos",
    snsAria: "Enlaces sociales",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Sitio oficial",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "Cajas de cartón ondulado y embalajes desde Kadoma (Osaka)",
    rights: "Todos los derechos reservados.",
  },
  de: {
    cta: "Kontakt",
    snsAria: "Soziale Links",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Offizielle Website",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "Wellpappkartons & Verpackungslösungen aus Kadoma (Osaka)",
    rights: "Alle Rechte vorbehalten.",
  },
  pt: {
    cta: "Fale conosco",
    snsAria: "Redes sociais",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Site oficial",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "Caixas de papelão ondulado e embalagens de Kadoma (Osaka)",
    rights: "Todos os direitos reservados.",
  },
  it: {
    cta: "Contattaci",
    snsAria: "Link social",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Sito ufficiale",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "Scatole in cartone ondulato e imballaggi da Kadoma (Osaka)",
    rights: "Tutti i diritti riservati.",
  },
  ru: {
    cta: "Связаться с нами",
    snsAria: "Ссылки на соцсети",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Официальный сайт",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "Гофрокартоные коробки и упаковка из Кадомы (Осака)",
    rights: "Все права защищены.",
  },
  th: {
    cta: "ติดต่อเรา",
    snsAria: "ลิงก์โซเชียล",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "เว็บไซต์ทางการ",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "กล่องลูกฟูกและบรรจุภัณฑ์จากเมืองคะโดะมะ (โอซาก้า)",
    rights: "สงวนลิขสิทธิ์",
  },
  vi: {
    cta: "Liên hệ",
    snsAria: "Liên kết mạng xã hội",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Trang chính thức",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "Hộp carton & giải pháp bao bì từ Kadoma (Osaka)",
    rights: "Mọi quyền được bảo lưu.",
  },
  id: {
    cta: "Hubungi kami",
    snsAria: "Tautan sosial",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Situs resmi",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "Karton bergelombang & kemasan dari Kadoma (Osaka)",
    rights: "Hak cipta dilindungi.",
  },
  hi: {
    cta: "संपर्क करें",
    snsAria: "सोशल लिंक",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "आधिकारिक वेबसाइट",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "कडोमा (ओसाका) से गत्ते के बॉक्स व पैकेजिंग",
    rights: "सर्वाधिकार सुरक्षित।",
  },
  ar: {
    cta: "اتصل بنا",
    snsAria: "روابط التواصل الاجتماعي",
    instagramAlt: "إنستغرام",
    lineAlt: "لاين",
    siteAria: "الموقع الرسمي",
    siteAlt: footerAlt(site.name),
    areaLinkText:
      "صناديق كرتون مضلع وحلول تغليف من كادوما (أوساكا)",
    rights: "جميع الحقوق محفوظة.",
  },
};

/* =========================
   FAQ データ（ここで集約管理）
========================= */
export const faqItems: FaqItem[] = [
  {
    question: "最小ロットはどのくらいから対応できますか？",
    answer:
      "サイズや仕様によって異なりますが、小ロットのご相談も承っています。まずはお問い合わせフォームよりご連絡ください。",
  },
  {
    question: "納期はどのくらいかかりますか？",
    answer:
      "仕様・数量により変動しますが、通常はご発注から数週間が目安です。お急ぎの場合も可能な範囲で調整いたします。",
  },
  {
    question: "サンプル製作は可能ですか？",
    answer:
      "はい、量産前に形状・寸法・強度を確認していただけるサンプル製作が可能です（内容によっては費用を頂戴する場合があります）。",
  },
  {
    question: "環境配慮型の素材や仕様には対応していますか？",
    answer:
      "国内生産の原紙を使用し、再生率90％以上の段ボールを製造しております。具体的な仕様についてはお気軽にご相談ください。",
  },
  {
    question: "全国発送は可能ですか？",
    answer:
      "はい、大阪府門真市の工場から日本全国への出荷に対応しています。ロットや配送先によって最適な配送方法をご提案いたします。",
  },
];

/* =========================
   ページ辞書（ogImage は任意）
========================= */
const PAGES = {
  home: {
    path: "/",
    title: `${site.name}｜オリジナル段ボール・梱包資材`,
    description:
      "《売り手よし》《買い手よし》《世間よし》三方よしの精神で経営するオリジナル段ボール・梱包資材ブランド。大光紙工の国内生産原紙と再生率90％以上の段ボールで、時代のニーズに合わせた【箱】のかたちをご提案します。",
    ogType: "website",
  },
  about: {
    path: "/about",
    title: `D.s.Labについて｜${site.name}`,
    description:
      "「売り手よし・買い手よし・世間よし」の三方よしの精神と、創業50年を誇る大光紙工の歴史。国内生産原紙・高いリサイクル率にこだわった段ボールづくりへの想いをご紹介します。",
    ogType: "website",
  },
  news: {
    path: "/news",
    title: `お知らせ｜${site.name}`,
    description: `${site.name} の最新情報や工場稼働スケジュール、新製品・キャンペーン等のお知らせを掲載します。`,
    ogType: "website",
  },
  areasLocal: {
    path: "/areas/local",
    title: `大阪府門真市の段ボール・梱包資材工場｜${site.name}`,
    description:
      "大阪府門真市北岸和田の自社工場から、日本全国のメーカー・EC事業者・小売店へオリジナル段ボール・梱包資材をお届けします。",
    ogType: "article",
  },
  products: {
    path: "/products",
    title: `商品一覧｜${site.name}`,
    description: `${site.name} のオリジナル段ボール・梱包資材の商品一覧。用途やサイズに合わせた各種パッケージを掲載しています。`,
    ogType: "website",
    ogImage: "/ogp-products.jpg",
  },
  productsEC: {
    path: "/products-ec",
    title: `オンライン販売（EC）｜${site.name}`,
    description: `${site.name} の段ボール・梱包資材をオンラインでご注文いただけるページです。標準サイズ箱からオリジナル仕様まで柔軟に対応します。`,
    ogType: "website",
    ogImage: "/ogp-products.jpg",
  },
  projects: {
    path: "/projects",
    title: `製作事例｜${site.name}`,
    description:
      "オーダーメイド段ボールや特殊形状の箱、ギフトボックスなど、${site.name} が手掛けた製作事例を写真付きでご紹介します。",
    ogType: "website",
  },
  stores: {
    path: "/stores",
    title: `会社情報・アクセス｜${site.name}`,
    description:
      "大阪府門真市北岸和田2-1-12にある自社工場・事務所の情報とアクセス方法をご案内します。TEL 072-882-0154。",
    ogType: "website",
  },
  faq: {
    path: "/faq",
    title: `よくある質問（FAQ）｜${site.name}`,
    description: `ロット・納期・サンプル・環境配慮など、${site.name} の段ボール・梱包資材に関するよくある質問をまとめました。`,
    ogType: "article",
  },
} as const;

export type PageKey = keyof typeof PAGES;
const pages: Record<PageKey, PageDef> = PAGES as unknown as Record<
  PageKey,
  PageDef
>;

/* =========================
   SEO メタデータビルダー
========================= */
export const seo = {
  base: (): Metadata => ({
    title: `${site.name}｜${site.tagline}`,
    description: site.description,
    keywords: Array.from(site.keywords),
    authors: [{ name: site.name }],
    metadataBase: METADATA_BASE_SAFE,
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
          {
            url: ogImage((p as any).ogImage),
            width: 1200,
            height: 630,
            alt: site.name,
          },
        ],
        locale: "ja_JP",
        type: p.ogType,
      },
      twitter: {
        card: "summary_large_image",
        title: p.title,
        description: p.description,
        images: [ogImage((p as any).ogImage)],
      },
      ...extra,
    };
  },
};

/* =========================
   FAQ → JSON-LD 変換
========================= */
export type QA = { q: string; a: string };
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

/* =========================
   AI サイト設定（ブランド名/URLは site に追従）
========================= */
export const AI_SITE: AiSiteConfig = {
  brand: site.name,
  url: site.baseUrl,
  areasByLang: {
    ja: "日本全国（大阪府門真市の自社工場から出荷）",
    en: "Nationwide Japan (factory based in Kadoma, Osaka)",
  },
  servicesByLang: {
    ja: ["オリジナル段ボール", "梱包資材", "エコ包装提案"],
    en: ["original corrugated boxes", "packaging materials", "eco packaging"],
  },
  retail: true,
  productPageRoute: "/products-ec",
  languages: {
    default: "ja",
    allowed: [
      "ja",
      "en",
      "zh",
      "zh-TW",
      "ko",
      "fr",
      "es",
      "de",
      "pt",
      "it",
      "ru",
      "th",
      "vi",
      "id",
      "hi",
      "ar",
    ],
  },
  limits: {
    qaBase: 30,
    qaOwner: 40,
    qaLearned: 60,
    menuLines: 120,
    productLines: 120,
    keywords: 200,
  },
};
