// components/common/Header.tsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Image from "next/image";
import clsx from "clsx";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { useHeaderLogoUrl } from "../../hooks/useHeaderLogoUrl";
import { auth, db } from "@/lib/firebase";
import { THEMES, ThemeKey } from "@/lib/themes";
import UILangFloatingPicker from "../UILangFloatingPicker";
import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { doc, onSnapshot } from "firebase/firestore";

/* ===== 多言語辞書 ===== */
type Keys =
  | "home"
  | "menuTitle"
  | "projects" // ★ 追加：旧 products（施工実績）
  | "products" // ★ 新設：商品一覧
  | "productsEC" // EC
  | "staffs"
  | "pricing"
  | "areas"
  | "stores"
  | "story"
  | "blog"
  | "news"
  | "company"
  | "reserve"
  | "contact"
  | "partners"
  | "timeline"
  | "community"
  | "analytics"
  | "admin"
  | "aiChat"
  | "hours";

const T: Record<UILang, Record<Keys, string>> = {
  ja: {
    menuTitle: "メニュー",
    home: "ホーム",
    projects: "施工実績",
    products: "商品一覧",
    productsEC: "オンラインショップ",
    staffs: "スタッフ",
    pricing: "料金",
    areas: "対応エリア",
    stores: "店舗一覧",
    story: "私たちの思い",
    blog: "ブログ",
    news: "お知らせ",
    company: "会社概要",
    reserve: "ご予約はこちら",
    contact: "お問い合わせ",
    partners: "協力業者募集！",
    timeline: "タイムライン",
    community: "コミュニティ",
    analytics: "分析",
    admin: "管理者ログイン",
    aiChat: "AIサポート",
    hours: "営業時間",
  },
  en: {
    menuTitle: "Menu",
    home: "Home",
    projects: "Projects",
    products: "Products",
    productsEC: "Online Store",
    staffs: "Staff",
    pricing: "Pricing",
    areas: "Service Areas",
    stores: "Store List",
    story: "Our Story",
    blog: "Blog",
    news: "News",
    company: "Company Profile",
    reserve: "Book Here",
    contact: "Contact",
    partners: "Partner Contractors Wanted!",
    timeline: "Timeline",
    community: "Community",
    analytics: "Analytics",
    admin: "Administrator Login",
    aiChat: "AI Chat",
    hours: "Hours",
  },
  zh: {
    menuTitle: "菜单",
    home: "首页",
    projects: "施工案例",
    products: "商品一览",
    productsEC: "网店",
    staffs: "员工",
    pricing: "价格",
    areas: "服务区域",
    stores: "门店列表",
    story: "我们的理念",
    blog: "博客",
    news: "公告",
    company: "公司简介",
    reserve: "点击预约",
    contact: "联系我们",
    partners: "招募合作业者！",
    timeline: "时间线",
    community: "社区",
    analytics: "分析",
    admin: "管理员登录",
    aiChat: "AI聊天",
    hours: "营业时间",
  },
  "zh-TW": {
    menuTitle: "選單",
    home: "首頁",
    projects: "施工案例",
    products: "商品一覽",
    productsEC: "網路商店",
    staffs: "員工",
    pricing: "價格",
    areas: "服務範圍",
    stores: "門市列表",
    story: "我們的理念",
    blog: "部落格",
    news: "最新消息",
    company: "公司簡介",
    reserve: "預約請點此",
    contact: "聯絡我們",
    partners: "招募合作廠商！",
    timeline: "時間軸",
    community: "社群",
    analytics: "分析",
    admin: "管理者登入",
    aiChat: "AI聊天",
    hours: "營業時間",
  },
  ko: {
    menuTitle: "메뉴",
    home: "홈",
    projects: "시공 사례",
    products: "상품 목록",
    productsEC: "온라인 스토어",
    staffs: "스태프",
    pricing: "요금",
    areas: "서비스 지역",
    stores: "매장 목록",
    story: "우리의 이야기",
    blog: "블로그",
    news: "공지사항",
    company: "회사 소개",
    reserve: "예약하기",
    contact: "문의하기",
    partners: "협력 업체 모집!",
    timeline: "타임라인",
    community: "커뮤니티",
    analytics: "분석",
    admin: "관리자 로그인",
    aiChat: "AI 채팅",
    hours: "영업시간",
  },
  fr: {
    menuTitle: "Menu",
    home: "Accueil",
    projects: "Réalisations",
    products: "Produits",
    productsEC: "Boutique en ligne",
    staffs: "Équipe",
    pricing: "Tarifs",
    areas: "Zones desservies",
    stores: "Liste des magasins",
    story: "Notre histoire",
    blog: "Blog",
    news: "Actualités",
    company: "Profil de l’entreprise",
    reserve: "Réserver ici",
    contact: "Contact",
    partners: "Partenaires recherchés !",
    timeline: "Timeline",
    community: "Communauté",
    analytics: "Analyses",
    admin: "Connexion administrateur",
    aiChat: "Chat IA",
    hours: "Horaires",
  },
  es: {
    menuTitle: "Menú",
    home: "Inicio",
    projects: "Proyectos",
    products: "Productos",
    productsEC: "Tienda en línea",
    staffs: "Equipo",
    pricing: "Precios",
    areas: "Áreas de servicio",
    stores: "Lista de tiendas",
    story: "Nuestra historia",
    blog: "Blog",
    news: "Noticias",
    company: "Perfil de la empresa",
    reserve: "Reservar aquí",
    contact: "Contacto",
    partners: "¡Buscamos colaboradores!",
    timeline: "Cronología",
    community: "Comunidad",
    analytics: "Analítica",
    admin: "Inicio de sesión de administrador",
    aiChat: "Chat IA",
    hours: "Horario",
  },
  de: {
    menuTitle: "Menü",
    home: "Startseite",
    projects: "Referenzen",
    products: "Produkte",
    productsEC: "Online-Shop",
    staffs: "Team",
    pricing: "Preise",
    areas: "Einsatzgebiete",
    stores: "Filialübersicht",
    story: "Unsere Geschichte",
    blog: "Blog",
    news: "Neuigkeiten",
    company: "Unternehmensprofil",
    reserve: "Hier buchen",
    contact: "Kontakt",
    partners: "Partner gesucht!",
    timeline: "Timeline",
    community: "Community",
    analytics: "Analytik",
    admin: "Administrator-Anmeldung",
    aiChat: "AI-Chat",
    hours: "Öffnungszeiten",
  },
  pt: {
    menuTitle: "Menu",
    home: "Início",
    projects: "Projetos",
    products: "Produtos",
    productsEC: "Loja Online",
    staffs: "Equipe",
    pricing: "Preços",
    areas: "Áreas de atendimento",
    stores: "Lista de lojas",
    story: "Nossa história",
    blog: "Blog",
    news: "Notícias",
    company: "Perfil da empresa",
    reserve: "Reservar aqui",
    contact: "Contato",
    partners: "Procuramos parceiros!",
    timeline: "Linha do tempo",
    community: "Comunidade",
    analytics: "Análises",
    admin: "Login do administrador",
    aiChat: "Chat IA",
    hours: "Horário",
  },
  it: {
    menuTitle: "Menu",
    home: "Home",
    projects: "Progetti",
    products: "Prodotti",
    productsEC: "Negozio online",
    staffs: "Staff",
    pricing: "Prezzi",
    areas: "Aree servite",
    stores: "Elenco negozi",
    story: "La nostra storia",
    blog: "Blog",
    news: "Notizie",
    company: "Profilo aziendale",
    reserve: "Prenota qui",
    contact: "Contatto",
    partners: "Cercasi partner!",
    timeline: "Timeline",
    community: "Community",
    analytics: "Analitiche",
    admin: "Accesso amministratore",
    aiChat: "Chat IA",
    hours: "Orari",
  },
  ru: {
    menuTitle: "Меню",
    home: "Главная",
    projects: "Наши работы",
    products: "Товары",
    productsEC: "Интернет-магазин",
    staffs: "Сотрудники",
    pricing: "Цены",
    areas: "Районы обслуживания",
    stores: "Список магазинов",
    story: "Наша история",
    blog: "Блог",
    news: "Новости",
    company: "О компании",
    reserve: "Онлайн-запись",
    contact: "Контакты",
    partners: "Ищем партнёров-подрядчиков!",
    timeline: "Лента",
    community: "Сообщество",
    analytics: "Аналитика",
    admin: "Вход администратора",
    aiChat: "AI-чат",
    hours: "Часы работы",
  },
  th: {
    menuTitle: "เมนู",
    home: "หน้าแรก",
    projects: "ผลงาน",
    products: "รายการสินค้า",
    productsEC: "ร้านค้าออนไลน์",
    staffs: "ทีมงาน",
    pricing: "ราคา",
    areas: "พื้นที่ให้บริการ",
    stores: "รายชื่อร้านค้า",
    story: "เรื่องราวของเรา",
    blog: "บล็อก",
    news: "ข่าวสาร",
    company: "ข้อมูลบริษัท",
    reserve: "จองที่นี่",
    contact: "ติดต่อเรา",
    partners: "รับสมัครพันธมิตร!",
    timeline: "ไทม์ไลน์",
    community: "คอมมูนิตี้",
    analytics: "วิเคราะห์",
    admin: "เข้าสู่ระบบผู้ดูแล",
    aiChat: "แชต AI",
    hours: "เวลาเปิดทำการ",
  },
  vi: {
    menuTitle: "Menu",
    home: "Trang chủ",
    projects: "Dự án đã làm",
    products: "Sản phẩm",
    productsEC: "Cửa hàng trực tuyến",
    staffs: "Nhân viên",
    pricing: "Bảng giá",
    areas: "Khu vực phục vụ",
    stores: "Danh sách cửa hàng",
    story: "Câu chuyện của chúng tôi",
    blog: "Blog",
    news: "Tin tức",
    company: "Hồ sơ công ty",
    reserve: "Đặt lịch tại đây",
    contact: "Liên hệ",
    partners: "Tuyển đối tác!",
    timeline: "Dòng thời gian",
    community: "Cộng đồng",
    analytics: "Phân tích",
    admin: "Đăng nhập quản trị",
    aiChat: "Trò chuyện AI",
    hours: "Giờ làm việc",
  },
  id: {
    menuTitle: "Menu",
    home: "Beranda",
    projects: "Portofolio",
    products: "Produk",
    productsEC: "Toko daring",
    staffs: "Staf",
    pricing: "Harga",
    areas: "Area layanan",
    stores: "Daftar toko",
    story: "Kisah kami",
    blog: "Blog",
    news: "Berita",
    company: "Profil perusahaan",
    reserve: "Pesan di sini",
    contact: "Kontak",
    partners: "Mencari mitra!",
    timeline: "Linimasa",
    community: "Komunitas",
    analytics: "Analitik",
    admin: "Masuk admin",
    aiChat: "Obrolan AI",
    hours: "Jam operasional",
  },
  hi: {
    menuTitle: "मेनू",
    home: "होम",
    projects: "परियोजनाएँ",
    products: "उत्पाद",
    productsEC: "ऑनलाइन स्टोर",
    staffs: "स्टाफ़",
    pricing: "मूल्य",
    areas: "सेवा क्षेत्र",
    stores: "स्टोर सूची",
    story: "हमारी कहानी",
    blog: "ब्लॉग",
    news: "समाचार",
    company: "कंपनी प्रोफ़ाइल",
    reserve: "यहाँ बुक करें",
    contact: "संपर्क करें",
    partners: "सहयोगी ठेकेदार आमंत्रित!",
    timeline: "टाइमलाइन",
    community: "समुदाय",
    analytics: "विश्लेषण",
    admin: "प्रशासक लॉगिन",
    aiChat: "AI चैट",
    hours: "समय",
  },
  ar: {
    menuTitle: "القائمة",
    home: "الصفحة الرئيسية",
    projects: "المشاريع المنجزة",
    products: "قائمة المنتجات",
    productsEC: "المتجر الإلكتروني",
    staffs: "الفريق",
    pricing: "الأسعار",
    areas: "مناطق الخدمة",
    stores: "قائمة المتاجر",
    story: "قصتنا",
    blog: "المدونة",
    news: "الأخبار",
    company: "نبذة عن الشركة",
    reserve: "احجز هنا",
    contact: "اتصل بنا",
    partners: "نبحث عن شركاء!",
    timeline: "الخط الزمني",
    community: "المجتمع",
    analytics: "التحليلات",
    admin: "تسجيل دخول المسؤول",
    aiChat: "دردشة الذكاء الاصطناعي",
    hours: "ساعات العمل",
  },
};

const HEADER_H = "3rem";
const TRIPLE_TAP_INTERVAL_MS = 500;
const IGNORE_SELECTOR = "a,button,input,select,textarea,[role='button']";

/* ===== メニュー定義 ===== */
const MENU_ITEMS: { key: keyof (typeof T)["ja"]; href: string }[] = [
  { key: "productsEC", href: "/productsEC" },
  { key: "home", href: "/" },
  { key: "projects", href: "/projects" }, // ★ 旧 products の中身はこちらへ
  { key: "products", href: "/products" }, // ★ 新しい商品一覧

  { key: "staffs", href: "/staffs" },
  { key: "pricing", href: "/menu" },
  { key: "hours", href: "/hours" },
  { key: "areas", href: "/areas" },
  { key: "stores", href: "/stores" },
  { key: "story", href: "/about" },
  { key: "blog", href: "/blog" },
  { key: "news", href: "/news" },
  { key: "company", href: "/company" },
  { key: "contact", href: "/contact" },
  { key: "reserve", href: "/apply" },
  { key: "aiChat", href: "/ai" },
  { key: "partners", href: "/jobApp" },
];

type EditableSettings = {
  visibleMenuKeys?: string[];
  i18n?: { enabled?: boolean; langs?: UILang[] };
  businessHours?: { enabled?: boolean }; // ★ 追加
};

export default function Header({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const gradient = useThemeGradient();
  const logoUrl = useHeaderLogoUrl();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => setIsLoggedIn(!!user));
    return () => unsub();
  }, []);

  const { uiLang } = useUILang();

  const [visibleMenuKeys, setVisibleMenuKeys] = useState<string[]>(
    MENU_ITEMS.map((m) => m.key)
  );
  const [i18nEnabled, setI18nEnabled] = useState<boolean>(true);

  useEffect(() => {
    const ref = doc(db, "siteSettingsEditable", SITE_KEY);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as EditableSettings;

        // i18n ON/OFF
        setI18nEnabled(
          typeof data.i18n?.enabled === "boolean" ? data.i18n.enabled : true
        );

        // ヘッダーで許可しているキーだけを使う
        const allowedKeys = new Set(MENU_ITEMS.map((m) => m.key));

        // 1) Firestore の visibleMenuKeys があればそれをベースに
        // 2) なければ、ヘッダーが持つ全メニューをベースに
        const baseFromDoc = Array.isArray(data.visibleMenuKeys)
          ? data.visibleMenuKeys.filter(
              (k): k is (typeof MENU_ITEMS)[number]["key"] =>
                allowedKeys.has(k as any)
            )
          : MENU_ITEMS.map((m) => m.key);

        const nextSet = new Set(baseFromDoc);

        // businessHours によって hours を強制加除
        const bhEnabled = data.businessHours?.enabled === true;
        if (bhEnabled) nextSet.add("hours");
        else nextSet.delete("hours");

        const next = Array.from(nextSet);

        console.debug("[Header] visibleMenuKeys <-", {
          fromDoc: data.visibleMenuKeys,
          bhEnabled,
          final: next,
        });

        setVisibleMenuKeys(next);
      },
      (error) => {
        console.error("メニュー/翻訳設定購読エラー:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const gradientClass = gradient
    ? `bg-gradient-to-b ${gradient}`
    : "bg-gray-100";

  const isDark = useMemo(() => {
    const darkKeys: ThemeKey[] = ["brandH", "brandG", "brandI"];
    if (!gradient) return false;
    return darkKeys.some((k) => gradient === THEMES[k]);
  }, [gradient]);

  const rtl = uiLang === "ar";

  // 日本語固定ラベル
  const JP_ALWAYS = new Set<Keys>([
    "timeline",
    "community",
    "analytics",
    "admin",
  ]);
  const labelOf = (k: Keys) =>
    JP_ALWAYS.has(k) ? T.ja[k] : (T[uiLang] ?? T.ja)[k];

  // 管理者リンク 3タップ
  const [showAdminLink, setShowAdminLink] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapAtRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setShowAdminLink(false);
      tapCountRef.current = 0;
      lastTapAtRef.current = 0;
    }
  }, [open]);

  const handleSecretTap = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest(IGNORE_SELECTOR)) return;
    const now = Date.now();
    const last = lastTapAtRef.current;

    if (now - last > TRIPLE_TAP_INTERVAL_MS) {
      tapCountRef.current = 1;
      lastTapAtRef.current = now;
      return;
    }
    tapCountRef.current += 1;
    lastTapAtRef.current = now;

    if (tapCountRef.current >= 3) {
      setShowAdminLink(true);
      tapCountRef.current = 0;
      lastTapAtRef.current = 0;
    }
  };

  return (
    <header
      className={clsx(
        "sticky top-0 z-30 flex items-center justify-between px-4 h-12",
        gradientClass,
        className,
        !isDark && "border-b border-gray-300"
      )}
      style={{ "--header-h": HEADER_H } as React.CSSProperties}
    >
      {/* ロゴ */}
      <Link
        href="/"
        className={clsx(
          "text-lg font-bold flex items-center gap-2 py-2 hover:opacity-50",
          "text-white text-outline"
        )}
      >
        {logoUrl && logoUrl.trim() !== "" && (
          <Image
            src={logoUrl}
            alt="ロゴ"
            width={48}
            height={48}
            className="w-12 h-12 object-contain transition-opacity duration-200"
            unoptimized
          />
        )}
        株式会社　福源屋
      </Link>

      {/* ハンバーガー */}
      <div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={clsx(
                "w-7 h-7 border-2",
                isDark ? "text-white border-white" : "border-black"
              )}
              aria-label={(T[uiLang] ?? T.ja).menuTitle}
            >
              <Menu size={26} />
            </Button>
          </SheetTrigger>

          {/* === スライド === */}
          <SheetContent
            side="right"
            className={clsx(
              "flex h-dvh min-h-0 flex-col p-0",
              gradient && "bg-gradient-to-b",
              gradient || "bg-gray-100",
              isDark
                ? "[&>button]:text-white [&>button>svg]:!text-white [&>button>svg]:stroke-[3] [&>button>svg]:w-7 [&>button>svg]:h-6"
                : "[&>button]:text-black [&>button>svg]:!text-black [&>button>svg]:stroke-[3] [&>button>svg]:w-7 [&>button>svg]:h-6"
            )}
            dir={rtl ? "rtl" : "ltr"}
          >
            {/* 視覚タイトル */}
            <SheetHeader className="pt-4 px-4">
              <SheetTitle className="text-center text-xl !text-white text-outline">
                {(T[uiLang] ?? T.ja).menuTitle}
              </SheetTitle>
            </SheetHeader>

            {/* 中央メニュー（上下センター） */}
            <div
              className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] px-6"
              onPointerDown={handleSecretTap}
            >
              <nav className="py-4 flex flex-col items-center text-center justify-center min-h-[60vh] space-y-3">
                {MENU_ITEMS.filter((item) =>
                  visibleMenuKeys.includes(item.key)
                ).map(({ key, href }) => (
                  <Link
                    key={key}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="text-lg text-white text-outline"
                  >
                    {labelOf(key as Keys)}
                  </Link>
                ))}
              </nav>

              {/* 言語ピッカー（翻訳が無効なら非表示） */}
              {i18nEnabled && (
                <div className="flex flex-col items-center gap-2 py-3">
                  <UILangFloatingPicker />
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="border-t border-white/30 px-6 py-4">
              <div className="flex flex-col items-center gap-2">
                {isLoggedIn && (
                  <>
                    <Link
                      href="/postList"
                      onClick={() => setOpen(false)}
                      className="text-center text-lg text-white text-outline"
                    >
                      {labelOf("timeline")}
                    </Link>
                    <Link
                      href="/community"
                      onClick={() => setOpen(false)}
                      className="text-center text-lg text-white text-outline"
                    >
                      {labelOf("community")}
                    </Link>
                    <Link
                      href="/analytics"
                      onClick={() => setOpen(false)}
                      className="text-center text-lg text-white text-outline"
                    >
                      {labelOf("analytics")}
                    </Link>
                  </>
                )}

                {(showAdminLink || isLoggedIn) && (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="text-center text-lg text-white text-outline"
                  >
                    {labelOf("admin")}
                  </Link>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
