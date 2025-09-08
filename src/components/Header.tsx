// components/layout/Header.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { useThemeGradient } from "@/lib/useThemeGradient";
import { useHeaderLogoUrl } from "../hooks/useHeaderLogoUrl";
import { auth } from "@/lib/firebase";
import { THEMES, ThemeKey } from "@/lib/themes";
import { useUILang } from "@/lib/atoms/uiLangAtom"; // ← Jotai の UI 言語
import LangPickerModal from "@/components/LangPickerModal"; // ← ご提示のモーダル（パス調整してOK）
import UILangFloatingPicker from "./UILangFloatingPicker";

const HEADER_H = "3rem";

/* =========================
   多言語テキスト
   - 既定: 日本語 "ja"
   - 対応: en, zh, zh-TW, ko, fr, es, de, pt, it, ru, th, vi, id, hi, ar
========================= */
type LangKey =
  | "ja"
  | "en"
  | "zh"
  | "zh-TW"
  | "ko"
  | "fr"
  | "es"
  | "de"
  | "pt"
  | "it"
  | "ru"
  | "th"
  | "vi"
  | "id"
  | "hi"
  | "ar";

type Strings = {
  menuTitle: string;
  nav: {
    products: string; // 施工実績
    staffs: string; // スタッフ
    menu: string; // 料金
    stores: string; // 対応エリア
    about: string; // 当店の思い
    blog: string; // ブログ
    company: string; // 会社概要
    apply: string; // ご予約はこちら
    jobApp: string; // 協力業者募集！
  };
  admin: string; // Administrator Login
  pickLang: string; // 言語を選択
};

const STRINGS: Record<LangKey, Strings> = {
  ja: {
    menuTitle: "メニュー",
    nav: {
      products: "施工実績",
      staffs: "スタッフ",
      menu: "料金",
      stores: "対応エリア",
      about: "当店の思い",
      blog: "ブログ",
      company: "会社概要",
      apply: "ご予約はこちら",
      jobApp: "協力業者募集！",
    },
    admin: "Administrator Login",
    pickLang: "言語を選択",
  },
  en: {
    menuTitle: "Menu",
    nav: {
      products: "Projects",
      staffs: "Staff",
      menu: "Pricing",
      stores: "Service Area",
      about: "Our Story",
      blog: "Blog",
      company: "Company",
      apply: "Book Now",
      jobApp: "Partners Wanted",
    },
    admin: "Administrator Login",
    pickLang: "Choose Language",
  },
  zh: {
    menuTitle: "菜单",
    nav: {
      products: "案例",
      staffs: "员工",
      menu: "价格",
      stores: "服务区域",
      about: "关于我们",
      blog: "博客",
      company: "公司简介",
      apply: "立即预约",
      jobApp: "招募合作伙伴",
    },
    admin: "Administrator Login",
    pickLang: "选择语言",
  },
  "zh-TW": {
    menuTitle: "選單",
    nav: {
      products: "案例",
      staffs: "員工",
      menu: "價格",
      stores: "服務範圍",
      about: "關於我們",
      blog: "部落格",
      company: "公司簡介",
      apply: "線上預約",
      jobApp: "招募合作夥伴",
    },
    admin: "Administrator Login",
    pickLang: "選擇語言",
  },
  ko: {
    menuTitle: "메뉴",
    nav: {
      products: "시공 실적",
      staffs: "스태프",
      menu: "요금",
      stores: "서비스 지역",
      about: "브랜드 스토리",
      blog: "블로그",
      company: "회사 소개",
      apply: "예약하기",
      jobApp: "협력업체 모집",
    },
    admin: "Administrator Login",
    pickLang: "언어 선택",
  },
  fr: {
    menuTitle: "Menu",
    nav: {
      products: "Réalisations",
      staffs: "Équipe",
      menu: "Tarifs",
      stores: "Zone d’intervention",
      about: "Notre philosophie",
      blog: "Blog",
      company: "Présentation",
      apply: "Réserver",
      jobApp: "Partenaires recherchés",
    },
    admin: "Administrator Login",
    pickLang: "Choisir la langue",
  },
  es: {
    menuTitle: "Menú",
    nav: {
      products: "Trabajos",
      staffs: "Equipo",
      menu: "Precios",
      stores: "Áreas de servicio",
      about: "Nuestra filosofía",
      blog: "Blog",
      company: "Empresa",
      apply: "Reservar",
      jobApp: "¡Buscamos socios!",
    },
    admin: "Administrator Login",
    pickLang: "Elegir idioma",
  },
  de: {
    menuTitle: "Menü",
    nav: {
      products: "Referenzen",
      staffs: "Team",
      menu: "Preise",
      stores: "Einsatzgebiet",
      about: "Unsere Philosophie",
      blog: "Blog",
      company: "Unternehmen",
      apply: "Jetzt buchen",
      jobApp: "Partner gesucht",
    },
    admin: "Administrator Login",
    pickLang: "Sprache wählen",
  },
  pt: {
    menuTitle: "Menu",
    nav: {
      products: "Projetos",
      staffs: "Equipe",
      menu: "Preços",
      stores: "Área de atendimento",
      about: "Nossa filosofia",
      blog: "Blog",
      company: "Empresa",
      apply: "Reservar",
      jobApp: "Procuramos parceiros",
    },
    admin: "Administrator Login",
    pickLang: "Escolher idioma",
  },
  it: {
    menuTitle: "Menu",
    nav: {
      products: "Lavori",
      staffs: "Staff",
      menu: "Prezzi",
      stores: "Aree coperte",
      about: "La nostra filosofia",
      blog: "Blog",
      company: "Azienda",
      apply: "Prenota",
      jobApp: "Cercasi partner",
    },
    admin: "Administrator Login",
    pickLang: "Scegli la lingua",
  },
  ru: {
    menuTitle: "Меню",
    nav: {
      products: "Наши работы",
      staffs: "Команда",
      menu: "Цены",
      stores: "Зона обслуживания",
      about: "Наша философия",
      blog: "Блог",
      company: "О компании",
      apply: "Записаться",
      jobApp: "Ищем партнёров",
    },
    admin: "Administrator Login",
    pickLang: "Выбрать язык",
  },
  th: {
    menuTitle: "เมนู",
    nav: {
      products: "ผลงาน",
      staffs: "ทีมงาน",
      menu: "ราคา",
      stores: "พื้นที่ให้บริการ",
      about: "ปรัชญาของเรา",
      blog: "บล็อก",
      company: "ข้อมูลบริษัท",
      apply: "จองตอนนี้",
      jobApp: "รับสมัครพาร์ทเนอร์",
    },
    admin: "Administrator Login",
    pickLang: "เลือกภาษา",
  },
  vi: {
    menuTitle: "Menu",
    nav: {
      products: "Dự án",
      staffs: "Đội ngũ",
      menu: "Bảng giá",
      stores: "Khu vực phục vụ",
      about: "Triết lý của chúng tôi",
      blog: "Blog",
      company: "Giới thiệu công ty",
      apply: "Đặt lịch",
      jobApp: "Tìm đối tác",
    },
    admin: "Administrator Login",
    pickLang: "Chọn ngôn ngữ",
  },
  id: {
    menuTitle: "Menu",
    nav: {
      products: "Portofolio",
      staffs: "Staf",
      menu: "Harga",
      stores: "Wilayah layanan",
      about: "Falsafah kami",
      blog: "Blog",
      company: "Profil perusahaan",
      apply: "Pesan sekarang",
      jobApp: "Mencari mitra",
    },
    admin: "Administrator Login",
    pickLang: "Pilih bahasa",
  },
  hi: {
    menuTitle: "मेनू",
    nav: {
      products: "कार्य",
      staffs: "स्टाफ",
      menu: "कीमतें",
      stores: "सेवा क्षेत्र",
      about: "हमारा दर्शन",
      blog: "ब्लॉग",
      company: "कंपनी परिचय",
      apply: "अभी बुक करें",
      jobApp: "साझेदारों की भर्ती",
    },
    admin: "Administrator Login",
    pickLang: "भाषा चुनें",
  },
  ar: {
    menuTitle: "القائمة",
    nav: {
      products: "أعمالنا",
      staffs: "الفريق",
      menu: "الأسعار",
      stores: "مناطق الخدمة",
      about: "فلسفتنا",
      blog: "المدونة",
      company: "نبذة عن الشركة",
      apply: "احجز الآن",
      jobApp: "نبحث عن شركاء",
    },
    admin: "Administrator Login",
    pickLang: "اختر اللغة",
  },
};

export default function Header({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [langModal, setLangModal] = useState(false);

  const gradient = useThemeGradient();
  const logoUrl = useHeaderLogoUrl();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Jotai: UI 表示言語（サイト全体で共有）
  const langCtx = useUILang() as any;
  const uiLang: LangKey = (langCtx?.uiLang as LangKey) ?? "ja";
  const setUiLang: ((k: LangKey) => void) | undefined =
    langCtx?.setUiLang ?? langCtx?.setUILang;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const s = STRINGS[uiLang] ?? STRINGS.ja;
  const isRTL = uiLang === "ar";

  const gradientClass = gradient
    ? `bg-gradient-to-b ${gradient}`
    : "bg-gray-100";

  const darkKeys: ThemeKey[] = ["brandH", "brandG", "brandI"];
  const currentKey = (Object.entries(THEMES).find(
    ([, v]) => v === gradient
  )?.[0] ?? null) as ThemeKey | null;
  const isDark = currentKey ? darkKeys.includes(currentKey) : false;

  // 言語選択確定
  const handleSelectLang = (k: LangKey) => {
    if (typeof setUiLang === "function") {
      setUiLang(k);
    } else {
      // フォールバック（万一 setter が未提供でも一時的に保持）
      try {
        localStorage.setItem("uiLang", k);
      } catch {}
    }
    setLangModal(false);
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
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ロゴ（ブランド名はそのまま） */}
      <Link
        href="/"
        className={clsx(
          "text-md font-bold flex items-center gap-2 py-2 hover:opacity-50",
          "text-white text-outline"
        )}
      >
        {logoUrl && logoUrl.trim() !== "" && (
          <Image
            src={logoUrl}
            alt="logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain transition-opacity duration-200"
            unoptimized
          />
        )}
        お掃除処たよって屋
      </Link>

      {/* 右側：SNS + 言語切替 + メニュー */}
      <div className="flex items-center gap-2 ml-auto">
        {/* SNS */}
        <nav className="flex gap-2 mr-1">
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

        {/* ハンバーガー */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={clsx(
                "w-8 h-8 border-2",
                isDark ? "text-white border-white" : "text-black border-black"
              )}
              aria-label="menu"
              title="menu"
            >
              <Menu size={22} />
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
            dir={isRTL ? "rtl" : "ltr"}
          >
            <SheetHeader className="pt-4 px-4">
              <SheetTitle
                className={clsx(
                  "text-center text-xl",
                  isDark ? "text-white" : "text-black"
                )}
              >
                {s.menuTitle}
              </SheetTitle>
            </SheetHeader>

            <UILangFloatingPicker />

            <div className="flex-1 flex flex-col justify-center items-center space-y-4 text-center">
              {[
                { href: "/products", label: s.nav.products },
                { href: "/staffs", label: s.nav.staffs },
                { href: "/menu", label: s.nav.menu },
                { href: "/stores", label: s.nav.stores },
                { href: "/about", label: s.nav.about },
                { href: "/blog", label: s.nav.blog },
                { href: "/company", label: s.nav.company },
                { href: "/apply", label: s.nav.apply },
                { href: "/jobApp", label: s.nav.jobApp },
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

            <div className="p-4 space-y-4">
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
                    タイムライン
                  </Link>
                  <Link
                    href="/community"
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block text-center text-lg",
                      isDark ? "text-white" : "text-black"
                    )}
                  >
                    コミュニティ
                  </Link>
                  <Link
                    href="/analytics"
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block text-center text-lg",
                      isDark ? "text-white" : "text-black"
                    )}
                  >
                    分析
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
                {s.admin}
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 言語選択モーダル */}
      <LangPickerModal
        open={langModal}
        onClose={() => setLangModal(false)}
        onSelect={handleSelectLang}
        busy={false}
      />
    </header>
  );
}
