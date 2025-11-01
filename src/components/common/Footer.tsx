// components/common/Footer.tsx
"use client";

import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";

type T = {
  cta: string;
  snsAria: string;
  instagramAlt: string;
  lineAlt: string;
  siteAria: string;
  siteAlt: string;
  areaLinkText: string;
  rights: string;
};

const STRINGS: Record<UILang, T> = {
  ja: {
    cta: "無料相談・お問い合わせ",
    snsAria: "SNSリンク",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "公式サイト",
    siteAlt: "株式会社 福源屋",
    areaLinkText: "大阪・関西の美装工事・ビルメンテナンス",
    rights: "All rights reserved.",
  },
  en: {
    cta: "Contact us",
    snsAria: "Social links",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Official website",
    siteAlt: "Fukugenya (Official)",
    areaLinkText: "Building cleaning & maintenance in Osaka/Kansai",
    rights: "All rights reserved.",
  },
  zh: {
    cta: "免费咨询・联系",
    snsAria: "社交链接",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "官网",
    siteAlt: "福源屋 官方",
    areaLinkText: "大阪/关西的美装工程与楼宇维护",
    rights: "版权所有。",
  },
  "zh-TW": {
    cta: "免費諮詢・聯絡我們",
    snsAria: "社群連結",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "官方網站",
    siteAlt: "福源屋 官方",
    areaLinkText: "大阪/關西的美裝工程與大樓維護",
    rights: "版權所有。",
  },
  ko: {
    cta: "문의하기",
    snsAria: "SNS 링크",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "공식 사이트",
    siteAlt: "후쿠겐야 공식",
    areaLinkText: "오사카/간사이 미장 공사·빌딩 유지관리",
    rights: "판권 소유.",
  },
  fr: {
    cta: "Nous contacter",
    snsAria: "Liens sociaux",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Site officiel",
    siteAlt: "Fukugenya (Officiel)",
    areaLinkText: "Nettoyage & maintenance de bâtiments à Osaka/Kansai",
    rights: "Tous droits réservés.",
  },
  es: {
    cta: "Contáctanos",
    snsAria: "Enlaces sociales",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Sitio oficial",
    siteAlt: "Fukugenya (Oficial)",
    areaLinkText: "Limpieza y mantenimiento en Osaka/Kansai",
    rights: "Todos los derechos reservados.",
  },
  de: {
    cta: "Kontakt",
    snsAria: "Soziale Links",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Offizielle Website",
    siteAlt: "Fukugenya (Offiziell)",
    areaLinkText: "Gebäudereinigung & -wartung in Osaka/Kansai",
    rights: "Alle Rechte vorbehalten.",
  },
  pt: {
    cta: "Fale conosco",
    snsAria: "Redes sociais",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Site oficial",
    siteAlt: "Fukugenya (Oficial)",
    areaLinkText: "Limpeza e manutenção em Osaka/Kansai",
    rights: "Todos os direitos reservados.",
  },
  it: {
    cta: "Contattaci",
    snsAria: "Link social",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Sito ufficiale",
    siteAlt: "Fukugenya (Ufficiale)",
    areaLinkText: "Pulizie e manutenzione a Osaka/Kansai",
    rights: "Tutti i diritti riservati.",
  },
  ru: {
    cta: "Связаться с нами",
    snsAria: "Ссылки на соцсети",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Официальный сайт",
    siteAlt: "Fukugenya (Официальный)",
    areaLinkText: "Уборка и обслуживание зданий в Осаке/Кансай",
    rights: "Все права защищены.",
  },
  th: {
    cta: "ติดต่อเรา",
    snsAria: "ลิงก์โซเชียล",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "เว็บไซต์ทางการ",
    siteAlt: "Fukugenya (ทางการ)",
    areaLinkText: "งานทำความสะอาดและบำรุงรักษาในโอซาก้า/คันไซ",
    rights: "สงวนลิขสิทธิ์",
  },
  vi: {
    cta: "Liên hệ",
    snsAria: "Liên kết mạng xã hội",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Trang chính thức",
    siteAlt: "Fukugenya (Chính thức)",
    areaLinkText: "Vệ sinh & bảo trì tại Osaka/Kansai",
    rights: "Mọi quyền được bảo lưu.",
  },
  id: {
    cta: "Hubungi kami",
    snsAria: "Tautan sosial",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "Situs resmi",
    siteAlt: "Fukugenya (Resmi)",
    areaLinkText:
      "Jasa pembersihan & pemeliharaan di Osaka/Kansai",
    rights: "Hak cipta dilindungi.",
  },
  hi: {
    cta: "संपर्क करें",
    snsAria: "सोशल लिंक",
    instagramAlt: "Instagram",
    lineAlt: "LINE",
    siteAria: "आधिकारिक वेबसाइट",
    siteAlt: "Fukugenya (आधिकारिक)",
    areaLinkText:
      "ओसाका/कंसाई में भवन सफाई व मेंटेनेंस",
    rights: "सर्वाधिकार सुरक्षित।",
  },
  ar: {
    cta: "اتصل بنا",
    snsAria: "روابط التواصل الاجتماعي",
    instagramAlt: "إنستغرام",
    lineAlt: "لاين",
    siteAria: "الموقع الرسمي",
    siteAlt: "فوكوغينيا (رسمي)",
    areaLinkText:
      "تنظيف وصيانة المباني في أوساكا/كانساي",
    rights: "جميع الحقوق محفوظة.",
  },
};

export default function Footer() {
  const { uiLang } = useUILang();
  const lang = (uiLang in STRINGS ? uiLang : "ja") as UILang;
  const t = STRINGS[lang];
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";


  return (
    <footer
      dir={dir}
      className="relative z-20 mt-10 border-t bg-white/30 text-sm text-white text-outline backdrop-blur supports-[backdrop-filter]:bg-white/40"
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* CTA（リンク無しのためボタン風のダミー表示） */}
          <div
            aria-label={t.cta}
            className="w-full max-w-xs sm:max-w-sm rounded-xl bg-primary px-6 py-3 font-semibold text-white/90 shadow hover:opacity-90"
          >
            {t.cta}
          </div>



          {/* エリアテキスト（リンク無し） */}
          <div className="space-y-1 text-xs leading-tight">
            <p>
              <span className="opacity-90">{t.areaLinkText}</span>
            </p>
          </div>

          {/* コピーライト */}
          <div className="space-y-1">
            <p className="font-semibold leading-tight">株式会社 福源屋</p>
            <p className="text-xs leading-tight">
              © {new Date().getFullYear()} 株式会社 福源屋. {t.rights}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
