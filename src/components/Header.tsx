// components/common/Header.tsx
"use client";

import { useEffect, useRef, useState } from "react";
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
import { useHeaderLogoUrl } from "../hooks/useHeaderLogoUrl";
import { auth, db } from "@/lib/firebase";
import { THEMES, ThemeKey } from "@/lib/themes";
import UILangFloatingPicker from "./UILangFloatingPicker";
import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { doc, onSnapshot } from "firebase/firestore";

/* ===== 多言語辞書（略） ===== */
type Keys =
  | "home"
  | "menuTitle"
  | "products"
  | "staffs"
  | "pricing"
  | "areas"
  | "stores"
  | "story"
  | "blog"
  | "company"
  | "reserve"
  | "contact"
  | "partners"
  | "timeline"
  | "community"
  | "analytics"
  | "admin";

const T: Record<UILang, Record<Keys, string>> = {
  ja: {
    menuTitle: "メニュー",
    home: "ホーム",
    products: "施工実績",
    staffs: "スタッフ",
    pricing: "料金",
    areas: "対応エリア",
    stores: "店舗一覧",
    story: "私たちの思い",
    blog: "ブログ",
    company: "会社概要",
    reserve: "ご予約はこちら",
    contact: "お問い合わせ",
    partners: "協力業者募集！",
    timeline: "タイムライン",
    community: "コミュニティ",
    analytics: "分析",
    admin: "管理者ログイン",
  },
  en: {
    menuTitle: "Menu",
    home: "Home",
    products: "Projects",
    staffs: "Staff",
    pricing: "Pricing",
    areas: "Service Areas",
    stores: "Store List",
    story: "Our Story",
    blog: "Blog",
    company: "Company Profile",
    reserve: "Book Here",
    contact: "Contact",
    partners: "Partner Contractors Wanted!",
    timeline: "Timeline",
    community: "Community",
    analytics: "Analytics",
    admin: "Administrator Login",
  },
  zh: {
    menuTitle: "菜单",
    home: "首页",
    products: "施工案例",
    staffs: "员工",
    pricing: "价格",
    areas: "服务区域",
    stores: "门店列表",
    story: "我们的理念",
    blog: "博客",
    company: "公司简介",
    reserve: "点击预约",
    contact: "联系我们",
    partners: "招募合作业者！",
    timeline: "时间线",
    community: "社区",
    analytics: "分析",
    admin: "管理员登录",
  },
  "zh-TW": {
    menuTitle: "選單",
    home: "首頁",
    products: "施工案例",
    staffs: "員工",
    pricing: "價格",
    areas: "服務範圍",
    stores: "門市列表",
    story: "我們的理念",
    blog: "部落格",
    company: "公司簡介",
    reserve: "預約請點此",
    contact: "聯絡我們",
    partners: "招募合作廠商！",
    timeline: "時間軸",
    community: "社群",
    analytics: "分析",
    admin: "管理者登入",
  },
  ko: {
    menuTitle: "메뉴",
    home: "홈",
    products: "시공 사례",
    staffs: "스태프",
    pricing: "요금",
    areas: "서비스 지역",
    stores: "매장 목록",
    story: "우리의 이야기",
    blog: "블로그",
    company: "회사 소개",
    reserve: "예약하기",
    contact: "문의하기",
    partners: "협력 업체 모집!",
    timeline: "타임라인",
    community: "커뮤니티",
    analytics: "분석",
    admin: "관리자 로그인",
  },
  fr: {
    menuTitle: "Menu",
    home: "Accueil",
    products: "Réalisations",
    staffs: "Équipe",
    pricing: "Tarifs",
    areas: "Zones desservies",
    stores: "Liste des magasins",
    story: "Notre histoire",
    blog: "Blog",
    company: "Profil de l’entreprise",
    reserve: "Réserver ici",
    contact: "Contact",
    partners: "Partenaires recherchés !",
    timeline: "Timeline",
    community: "Communauté",
    analytics: "Analyses",
    admin: "Connexion administrateur",
  },
  es: {
    menuTitle: "Menú",
    home: "Inicio",
    products: "Proyectos",
    staffs: "Equipo",
    pricing: "Precios",
    areas: "Áreas de servicio",
    stores: "Lista de tiendas",
    story: "Nuestra historia",
    blog: "Blog",
    company: "Perfil de la empresa",
    reserve: "Reservar aquí",
    contact: "Contacto",
    partners: "¡Buscamos colaboradores!",
    timeline: "Cronología",
    community: "Comunidad",
    analytics: "Analítica",
    admin: "Inicio de sesión de administrador",
  },
  de: {
    menuTitle: "Menü",
    home: "Startseite",
    products: "Referenzen",
    staffs: "Team",
    pricing: "Preise",
    areas: "Einsatzgebiete",
    stores: "Filialübersicht",
    story: "Unsere Geschichte",
    blog: "Blog",
    company: "Unternehmensprofil",
    reserve: "Hier buchen",
    contact: "Kontakt",
    partners: "Partner gesucht!",
    timeline: "Timeline",
    community: "Community",
    analytics: "Analytik",
    admin: "Administrator-Anmeldung",
  },
  pt: {
    menuTitle: "Menu",
    home: "Início",
    products: "Projetos",
    staffs: "Equipe",
    pricing: "Preços",
    areas: "Áreas de atendimento",
    stores: "Lista de lojas",
    story: "Nossa história",
    blog: "Blog",
    company: "Perfil da empresa",
    reserve: "Reservar aqui",
    contact: "Contato",
    partners: "Procuramos parceiros!",
    timeline: "Linha do tempo",
    community: "Comunidade",
    analytics: "Análises",
    admin: "Login do administrador",
  },
  it: {
    menuTitle: "Menu",
    home: "Home",
    products: "Progetti",
    staffs: "Staff",
    pricing: "Prezzi",
    areas: "Aree servite",
    stores: "Elenco negozi",
    story: "La nostra storia",
    blog: "Blog",
    company: "Profilo aziendale",
    reserve: "Prenota qui",
    contact: "Contatto",
    partners: "Cercasi partner!",
    timeline: "Timeline",
    community: "Community",
    analytics: "Analitiche",
    admin: "Accesso amministratore",
  },
  ru: {
    menuTitle: "Меню",
    home: "Главная",
    products: "Наши работы",
    staffs: "Сотрудники",
    pricing: "Цены",
    areas: "Районы обслуживания",
    stores: "Список магазинов",
    story: "Наша история",
    blog: "Блог",
    company: "О компании",
    reserve: "Онлайн-запись",
    contact: "Контакты",
    partners: "Ищем партнёров-подрядчиков!",
    timeline: "Лента",
    community: "Сообщество",
    analytics: "Аналитика",
    admin: "Вход администратора",
  },
  th: {
    menuTitle: "เมนู",
    home: "หน้าแรก",
    products: "ผลงาน",
    staffs: "ทีมงาน",
    pricing: "ราคา",
    areas: "พื้นที่ให้บริการ",
    stores: "รายชื่อร้านค้า",
    story: "เรื่องราวของเรา",
    blog: "บล็อก",
    company: "ข้อมูลบริษัท",
    reserve: "จองที่นี่",
    contact: "ติดต่อเรา",
    partners: "รับสมัครพันธมิตร!",
    timeline: "ไทม์ไลน์",
    community: "คอมมูนิตี้",
    analytics: "วิเคราะห์",
    admin: "เข้าสู่ระบบผู้ดูแล",
  },
  vi: {
    menuTitle: "Menu",
    home: "Trang chủ",
    products: "Dự án đã làm",
    staffs: "Nhân viên",
    pricing: "Bảng giá",
    areas: "Khu vực phục vụ",
    stores: "Danh sách cửa hàng",
    story: "Câu chuyện của chúng tôi",
    blog: "Blog",
    company: "Hồ sơ công ty",
    reserve: "Đặt lịch tại đây",
    contact: "Liên hệ",
    partners: "Tuyển đối tác!",
    timeline: "Dòng thời gian",
    community: "Cộng đồng",
    analytics: "Phân tích",
    admin: "Đăng nhập quản trị",
  },
  id: {
    menuTitle: "Menu",
    home: "Beranda",
    products: "Portofolio",
    staffs: "Staf",
    pricing: "Harga",
    areas: "Area layanan",
    stores: "Daftar toko",
    story: "Kisah kami",
    blog: "Blog",
    company: "Profil perusahaan",
    reserve: "Pesan di sini",
    contact: "Kontak",
    partners: "Mencari mitra!",
    timeline: "Linimasa",
    community: "Komunitas",
    analytics: "Analitik",
    admin: "Masuk admin",
  },
  hi: {
    menuTitle: "मेनू",
    home: "होम",
    products: "परियोजनाएँ",
    staffs: "स्टाफ़",
    pricing: "मूल्य",
    areas: "सेवा क्षेत्र",
    stores: "स्टोर सूची",
    story: "हमारी कहानी",
    blog: "ब्लॉग",
    company: "कंपनी प्रोफ़ाइल",
    reserve: "यहाँ बुक करें",
    contact: "संपर्क करें",
    partners: "सहयोगी ठेकेदार आमंत्रित!",
    timeline: "टाइमलाइन",
    community: "समुदाय",
    analytics: "विश्लेषण",
    admin: "प्रशासक लॉगिन",
  },
  ar: {
    menuTitle: "القائمة",
    home: "الصفحة الرئيسية",
    products: "المشاريع المنجزة",
    staffs: "الفريق",
    pricing: "الأسعار",
    areas: "مناطق الخدمة",
    stores: "قائمة المتاجر",
    story: "قصتنا",
    blog: "المدونة",
    company: "نبذة عن الشركة",
    reserve: "احجز هنا",
    contact: "اتصل بنا",
    partners: "نبحث عن شركاء!",
    timeline: "الخط الزمني",
    community: "المجتمع",
    analytics: "التحليلات",
    admin: "تسجيل دخول المسؤول",
  },
};

const HEADER_H = "3rem";
const TRIPLE_TAP_INTERVAL_MS = 500;
const IGNORE_SELECTOR = "a,button,input,select,textarea,[role='button']";

// ===== メニュー定義 =====
const MENU_ITEMS: { key: keyof (typeof T)["ja"]; href: string }[] = [
  { key: "home", href: "/" },
  { key: "products", href: "/products" },
  { key: "staffs", href: "/staffs" },
  { key: "pricing", href: "/menu" },
  { key: "areas", href: "/areas" },
  { key: "stores", href: "/stores" },
  { key: "story", href: "/about" },
  { key: "blog", href: "/blog" },
  { key: "company", href: "/company" },
  { key: "contact", href: "/contact" },
  { key: "reserve", href: "/apply" },
  { key: "partners", href: "/jobApp" },
];

export default function Header({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const gradient = useThemeGradient();
  const logoUrl = useHeaderLogoUrl();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { uiLang } = useUILang();

  // Firestore: 表示対象メニュー
  const [visibleMenuKeys, setVisibleMenuKeys] = useState<string[]>(
    MENU_ITEMS.map((m) => m.key)
  );

  useEffect(() => {
    const ref = doc(db, "siteSettingsEditable", SITE_KEY);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as { visibleMenuKeys?: string[] };
          if (Array.isArray(data.visibleMenuKeys)) {
            setVisibleMenuKeys(data.visibleMenuKeys);
          }
        }
      },
      (error) => {
        console.error("メニュー設定購読エラー:", error);
      }
    );

    return () => unsubscribe(); // コンポーネント unmount 時に購読解除
  }, []);

  // ログイン状態
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const gradientClass = gradient
    ? `bg-gradient-to-b ${gradient}`
    : "bg-gray-100";

  const darkKeys: ThemeKey[] = ["brandH", "brandG", "brandI"];
  const currentKey = (Object.entries(THEMES).find(
    ([, v]) => v === gradient
  )?.[0] ?? null) as ThemeKey | null;
  const isDark = currentKey ? darkKeys.includes(currentKey) : false;

  const t = T[uiLang] ?? T.ja;
  const rtl = uiLang === "ar";

  // 管理者リンクの3タップ検出
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
            className="w-12 h-12 object-contain transition-opacity duration-200 "
            unoptimized
          />
        )}
        お掃除処たよって屋
      </Link>



      {/* ハンバーガーメニュー */}
      <div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={clsx(
                "w-7 h-7 border-2",
                isDark ? "text-white border-white" : "text-black border-black"
              )}
              aria-label={t.menuTitle}
            >
              <Menu size={26} />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className={clsx(
              "flex flex-col",
              "bg-gray-100",
              gradient && "bg-gradient-to-b",
              gradient
            )}
            dir={rtl ? "rtl" : "ltr"}
          >
            <div
              className="flex flex-col h-full"
              onPointerDown={handleSecretTap}
            >
              <SheetHeader className="pt-4 px-4">
                <SheetTitle className="text-center text-xl !text-white text-outline">
                  {t.menuTitle}
                </SheetTitle>
              </SheetHeader>

              {/* メインメニュー */}
              <div className="flex-1 flex flex-col justify-center items-center space-y-2 text-center">
                {MENU_ITEMS.filter((item) =>
                  visibleMenuKeys.includes(item.key)
                ).map(({ key, href }) => (
                  <Link
                    key={key}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={clsx("text-lg", "text-white text-outline")}
                  >
                    {t[key]}
                  </Link>
                ))}
              </div>

              {/* 言語ピッカー */}
              <UILangFloatingPicker />

              {/* フッターリンク */}
              <div className="p-4 space-y-2">
                {isLoggedIn && (
                  <>
                    <Link
                      href="/postList"
                      onClick={() => setOpen(false)}
                      className={clsx(
                        "block text-center text-lg",
                        "text-white text-outline"
                      )}
                    >
                      {t.timeline}
                    </Link>
                    <Link
                      href="/community"
                      onClick={() => setOpen(false)}
                      className={clsx(
                        "block text-center text-lg",
                        "text-white text-outline"
                      )}
                    >
                      {t.community}
                    </Link>
                    <Link
                      href="/analytics"
                      onClick={() => setOpen(false)}
                      className={clsx(
                        "block text-center text-lg",
                        "text-white text-outline"
                      )}
                    >
                      {t.analytics}
                    </Link>
                  </>
                )}

                {(showAdminLink || isLoggedIn) && (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block text-center text-lg",
                      "text-white text-outline"
                    )}
                  >
                    {t.admin}
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
