// components/common/Header.tsx など
"use client";

import { useEffect, useState } from "react";
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
import { auth } from "@/lib/firebase";
import { THEMES, ThemeKey } from "@/lib/themes";
import UILangFloatingPicker from "./UILangFloatingPicker";
import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";

/* =========================
   事前定義の多言語辞書
========================= */
type Keys =
  | "menuTitle"
  | "products"
  | "staffs"
  | "pricing"
  | "areas"
  | "story"
  | "blog"
  | "company"
  | "reserve"
  | "partners"
  | "timeline"
  | "community"
  | "analytics"
  | "admin";

const T: Record<UILang, Record<Keys, string>> = {
  ja: {
    menuTitle: "メニュー",
    products: "施工実績",
    staffs: "スタッフ",
    pricing: "料金",
    areas: "対応エリア",
    story: "当店の思い",
    blog: "ブログ",
    company: "会社概要",
    reserve: "ご予約はこちら",
    partners: "協力業者募集！",
    timeline: "タイムライン",
    community: "コミュニティ",
    analytics: "分析",
    admin: "管理者ログイン",
  },
  en: {
    menuTitle: "Menu",
    products: "Projects",
    staffs: "Staff",
    pricing: "Pricing",
    areas: "Service Areas",
    story: "Our Story",
    blog: "Blog",
    company: "Company Profile",
    reserve: "Book Here",
    partners: "Partner Contractors Wanted!",
    timeline: "Timeline",
    community: "Community",
    analytics: "Analytics",
    admin: "Administrator Login",
  },
  zh: {
    menuTitle: "菜单",
    products: "施工案例",
    staffs: "员工",
    pricing: "价格",
    areas: "服务区域",
    story: "我们的理念",
    blog: "博客",
    company: "公司简介",
    reserve: "点击预约",
    partners: "招募合作业者！",
    timeline: "时间线",
    community: "社区",
    analytics: "分析",
    admin: "管理员登录",
  },
  "zh-TW": {
    menuTitle: "選單",
    products: "施工案例",
    staffs: "員工",
    pricing: "價格",
    areas: "服務範圍",
    story: "我們的理念",
    blog: "部落格",
    company: "公司簡介",
    reserve: "預約請點此",
    partners: "招募合作廠商！",
    timeline: "時間軸",
    community: "社群",
    analytics: "分析",
    admin: "管理者登入",
  },
  ko: {
    menuTitle: "메뉴",
    products: "시공 사례",
    staffs: "스태프",
    pricing: "요금",
    areas: "서비스 지역",
    story: "우리의 이야기",
    blog: "블로그",
    company: "회사 소개",
    reserve: "예약하기",
    partners: "협력 업체 모집!",
    timeline: "타임라인",
    community: "커뮤니티",
    analytics: "분석",
    admin: "관리자 로그인",
  },
  fr: {
    menuTitle: "Menu",
    products: "Réalisations",
    staffs: "Équipe",
    pricing: "Tarifs",
    areas: "Zones desservies",
    story: "Notre histoire",
    blog: "Blog",
    company: "Profil de l’entreprise",
    reserve: "Réserver ici",
    partners: "Partenaires recherchés !",
    timeline: "Timeline",
    community: "Communauté",
    analytics: "Analyses",
    admin: "Connexion administrateur",
  },
  es: {
    menuTitle: "Menú",
    products: "Proyectos",
    staffs: "Equipo",
    pricing: "Precios",
    areas: "Áreas de servicio",
    story: "Nuestra historia",
    blog: "Blog",
    company: "Perfil de la empresa",
    reserve: "Reservar aquí",
    partners: "¡Buscamos colaboradores!",
    timeline: "Cronología",
    community: "Comunidad",
    analytics: "Analítica",
    admin: "Inicio de sesión de administrador",
  },
  de: {
    menuTitle: "Menü",
    products: "Referenzen",
    staffs: "Team",
    pricing: "Preise",
    areas: "Einsatzgebiete",
    story: "Unsere Geschichte",
    blog: "Blog",
    company: "Unternehmensprofil",
    reserve: "Hier buchen",
    partners: "Partner gesucht!",
    timeline: "Timeline",
    community: "Community",
    analytics: "Analytik",
    admin: "Administrator-Anmeldung",
  },
  pt: {
    menuTitle: "Menu",
    products: "Projetos",
    staffs: "Equipe",
    pricing: "Preços",
    areas: "Áreas de atendimento",
    story: "Nossa história",
    blog: "Blog",
    company: "Perfil da empresa",
    reserve: "Reservar aqui",
    partners: "Procuramos parceiros!",
    timeline: "Linha do tempo",
    community: "Comunidade",
    analytics: "Análises",
    admin: "Login do administrador",
  },
  it: {
    menuTitle: "Menu",
    products: "Progetti",
    staffs: "Staff",
    pricing: "Prezzi",
    areas: "Aree servite",
    story: "La nostra storia",
    blog: "Blog",
    company: "Profilo aziendale",
    reserve: "Prenota qui",
    partners: "Cercasi partner!",
    timeline: "Timeline",
    community: "Community",
    analytics: "Analitiche",
    admin: "Accesso amministratore",
  },
  ru: {
    menuTitle: "Меню",
    products: "Наши работы",
    staffs: "Сотрудники",
    pricing: "Цены",
    areas: "Районы обслуживания",
    story: "Наша история",
    blog: "Блог",
    company: "О компании",
    reserve: "Онлайн-запись",
    partners: "Ищем партнёров-подрядчиков!",
    timeline: "Лента",
    community: "Сообщество",
    analytics: "Аналитика",
    admin: "Вход администратора",
  },
  th: {
    menuTitle: "เมนู",
    products: "ผลงาน",
    staffs: "ทีมงาน",
    pricing: "ราคา",
    areas: "พื้นที่ให้บริการ",
    story: "เรื่องราวของเรา",
    blog: "บล็อก",
    company: "ข้อมูลบริษัท",
    reserve: "จองที่นี่",
    partners: "รับสมัครพันธมิตร!",
    timeline: "ไทม์ไลน์",
    community: "คอมมูนิตี้",
    analytics: "วิเคราะห์",
    admin: "เข้าสู่ระบบผู้ดูแล",
  },
  vi: {
    menuTitle: "Menu",
    products: "Dự án đã làm",
    staffs: "Nhân viên",
    pricing: "Bảng giá",
    areas: "Khu vực phục vụ",
    story: "Câu chuyện của chúng tôi",
    blog: "Blog",
    company: "Hồ sơ công ty",
    reserve: "Đặt lịch tại đây",
    partners: "Tuyển đối tác!",
    timeline: "Dòng thời gian",
    community: "Cộng đồng",
    analytics: "Phân tích",
    admin: "Đăng nhập quản trị",
  },
  id: {
    menuTitle: "Menu",
    products: "Portofolio",
    staffs: "Staf",
    pricing: "Harga",
    areas: "Area layanan",
    story: "Kisah kami",
    blog: "Blog",
    company: "Profil perusahaan",
    reserve: "Pesan di sini",
    partners: "Mencari mitra!",
    timeline: "Linimasa",
    community: "Komunitas",
    analytics: "Analitik",
    admin: "Masuk admin",
  },
  hi: {
    menuTitle: "मेनू",
    products: "परियोजनाएँ",
    staffs: "स्टाफ़",
    pricing: "मूल्य",
    areas: "सेवा क्षेत्र",
    story: "हमारी कहानी",
    blog: "ब्लॉग",
    company: "कंपनी प्रोफ़ाइल",
    reserve: "यहाँ बुक करें",
    partners: "सहयोगी ठेकेदार आमंत्रित!",
    timeline: "टाइमलाइन",
    community: "समुदाय",
    analytics: "विश्लेषण",
    admin: "प्रशासक लॉगिन",
  },
  ar: {
    menuTitle: "القائمة",
    products: "المشاريع المنجزة",
    staffs: "الفريق",
    pricing: "الأسعار",
    areas: "مناطق الخدمة",
    story: "قصتنا",
    blog: "المدونة",
    company: "نبذة عن الشركة",
    reserve: "احجز هنا",
    partners: "نبحث عن شركاء!",
    timeline: "الخط الزمني",
    community: "المجتمع",
    analytics: "التحليلات",
    admin: "تسجيل دخول المسؤول",
  },
};

const HEADER_H = "3rem";

export default function Header({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const gradient = useThemeGradient();
  const logoUrl = useHeaderLogoUrl();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { uiLang } = useUILang();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const gradientClass = gradient
    ? `bg-gradient-to-b ${gradient}`
    : "bg-gray-100";

  // ダーク判定（brandH, brandG, brandI）
  const darkKeys: ThemeKey[] = ["brandH", "brandG", "brandI"];
  const currentKey = (Object.entries(THEMES).find(
    ([, v]) => v === gradient
  )?.[0] ?? null) as ThemeKey | null;
  const isDark = currentKey ? darkKeys.includes(currentKey) : false;

  const t = T[uiLang] ?? T.ja;
  const rtl = uiLang === "ar";

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
          "text-md font-bold flex items-center gap-2 py-2 hover:opacity-50",
          isDark ? "text-white" : "text-black"
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
        {/* 屋号はそのまま表示（必要なら多言語化可） */}
        お掃除処たよって屋
      </Link>

      {/* SNS アイコン */}
      <nav
        className={clsx("flex gap-2 ml-auto mr-2", rtl && "flex-row-reverse")}
      >
        <a
          href="https://www.instagram.com/yuki.tayotte2017?igsh=MWY2b2RxMDM5M3dmdw%3D%3D&utm_source=qr"
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            isDark ? "text-white" : "text-black",
            "hover:text-pink-600 transition"
          )}
        >
          <Image
            src="/instagram-logo.png"
            alt="Instagram"
            width={32}
            height={32}
            className="object-contain"
            unoptimized
          />
        </a>
        <a
          href="https://lin.ee/YcKAJja"
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            isDark ? "text-white" : "text-black",
            "hover:text-pink-600 transition"
          )}
        >
          <Image
            src="/line-logo.png"
            alt="LINE"
            width={32}
            height={32}
            className="object-contain"
            unoptimized
          />
        </a>
        <a
          href="https://tayotteya.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            isDark ? "text-white" : "text-black",
            "hover:text-pink-600 transition"
          )}
        >
          <Image
            src="/tayotteya_circle_image.png"
            alt="Home"
            width={32}
            height={32}
            className="object-contain"
            unoptimized
          />
        </a>
      </nav>

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
            <SheetHeader className="pt-4 px-4">
              <SheetTitle
                className={clsx(
                  "text-center text-xl",
                  isDark ? "text-white" : "text-black"
                )}
              >
                {t.menuTitle}
              </SheetTitle>
            </SheetHeader>

            {/* 言語ピッカー（既存のフローティング版をここで表示） */}

            <UILangFloatingPicker />

            <div className="flex-1 flex flex-col justify-center items-center space-y-2 text-center">
              {[
                { href: "/products", label: t.products },
                { href: "/staffs", label: t.staffs },
                { href: "/menu", label: t.pricing },
                { href: "/stores", label: t.areas },
                { href: "/about", label: t.story },
                { href: "/blog", label: t.blog },
                { href: "/company", label: t.company },
                { href: "/apply", label: t.reserve },
                { href: "/jobApp", label: t.partners },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "text-lg",
                    isDark ? "text-white" : "text-black"
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="p-4 space-y-2">
              {isLoggedIn && (
                <>
                  <Link
                    href="/postList"
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block text-center text-lg",
                      isDark ? "text-white" : "text-black"
                    )}
                  >
                    {t.timeline}
                  </Link>
                  <Link
                    href="/community"
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block text-center text-lg",
                      isDark ? "text-white" : "text-black"
                    )}
                  >
                    {t.community}
                  </Link>
                  <Link
                    href="/analytics"
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block text-center text-lg",
                      isDark ? "text-white" : "text-black"
                    )}
                  >
                    {t.analytics}
                  </Link>
                </>
              )}

              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className={clsx(
                  "block text-center text-lg",
                  isDark ? "text-white" : "text-black"
                )}
              >
                {t.admin}
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
