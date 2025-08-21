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

const LIGHT_THEMES = [
  "from-[rgba(255,255,255,0.7)] to-[rgba(255,255,255,0.7)]", // 単色白
  "from-[rgba(250,219,159,0.7)] to-[rgba(255,255,255,0.7)]", // クリーム系など
  "from-[rgba(152,251,152,0.7)] to-[rgba(224,255,255,0.7)]",
  "from-[rgba(173,216,230,0.7)] to-[rgba(255,250,205,0.7)]",
];

type HeaderProps = {
  className?: string;
};

const SNS: {
  name: string;
  href: string;
  icon: React.FC;
}[] = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/yuki.tayotte2017?igsh=MWY2b2RxMDM5M3dmdw%3D%3D&utm_source=qr",
    icon: () => (
      <Image
        src="/instagram-logo.png"
        alt="Instagram"
        width={32}
        height={32}
        className="object-contain"
      />
    ),
  },
  {
    name: "LINE",
    href: "https://lin.ee/YcKAJja",
    icon: () => (
      <Image
        src="/line-logo.png"
        alt="LINE"
        width={32}
        height={32}
        className="object-contain"
      />
    ),
  },
  {
    name: "homepage",
    href: "https://tayotteya.com/",
    icon: () => (
      <Image
        src="/tayotteya_circle_image.png"
        alt="Home"
        width={32}
        height={32}
        className="object-contain"
      />
    ),
  },
];

const HEADER_H = "3rem";

export default function Header({ className = "" }: HeaderProps) {
  /* ▼ 追加：Sheet の開閉を管理するステート */
  const [open, setOpen] = useState(false);
  const gradient = useThemeGradient();
  const logoUrl = useHeaderLogoUrl();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const gradientClass = gradient
    ? `bg-gradient-to-b ${gradient}`
    : "bg-gray-100";

  const isLightBg = !gradient || LIGHT_THEMES.includes(gradient);

  return (
    <header
      className={clsx(
        "sticky top-0 z-30 flex items-center justify-between px-4 h-12",
        gradientClass,
        isLightBg && "border-b border-gray-300", // 明るい場合アンダーバー
        className
      )}
      style={{ "--header-h": HEADER_H } as React.CSSProperties}
    >
      {/* ロゴ */}
      <Link
        href="/"
        className={clsx(
          "text-xl font-bold flex items-center gap-2 py-2 hover:opacity-50",
          isLightBg ? "text-black" : "text-white"
        )}
      >
        {logoUrl && logoUrl.trim() !== "" && (
          <Image
            src={logoUrl}
            alt="ロゴ"
            width={48}
            height={48}
            className="w-12 h-12 object-contain transition-opacity duration-200"
          />
        )}
        お掃除処たよって屋
      </Link>

      <nav className="flex gap-2 ml-auto mr-2">
        {SNS.map(({ name, href, icon: Icon }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={name}
            className="text-white hover:text-pink-600 transition"
          >
            <Icon />
          </a>
        ))}
      </nav>

      {/* スマホハンバーガー */}
      <div>
        {/* open / onOpenChange を指定 */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={clsx(
                "w-7 h-7 border-2",
                isLightBg
                  ? "text-black border-black"
                  : "text-white border-white"
              )}
            >
              <Menu size={26} />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className={clsx(
              "flex flex-col",
              "bg-gray-100", // ← まずデフォルト背景
              gradient && "bg-gradient-to-b", // gradient があれば方向クラス
              gradient, // 実際の gradient 色クラス
              "[&_[data-radix-sheet-close]]:w-10 [&_[data-radix-sheet-close]]:h-10",
              "[&_[data-radix-sheet-close]_svg]:w-6 [&_[data-radix-sheet-close]_svg]:h-6"
            )}
          >
            <SheetHeader className="pt-4 px-4">
              <SheetTitle className="text-center text-xl text-white">
                メニュー
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 flex flex-col justify-center items-center space-y-4 text-center">
              {/* onClick で setOpen(false) */}

              <Link
                href="/products"
                onClick={() => setOpen(false)}
                className="text-lg text-white"
              >
                施工実績
              </Link>
              <Link
                href="/staffs"
                onClick={() => setOpen(false)}
                className="text-lg text-white"
              >
                スタッフ
              </Link>
              <Link
                href="/menu"
                onClick={() => setOpen(false)}
                className="text-lg text-white"
              >
                料金
              </Link>
              <Link
                href="/stores"
                onClick={() => setOpen(false)}
                className="text-lg text-white"
              >
                アクセス
              </Link>
              <Link
                href="/about"
                onClick={() => setOpen(false)}
                className="text-lg text-white"
              >
                当店の思い
              </Link>
              <Link
                href="/news"
                onClick={() => setOpen(false)}
                className="text-lg text-white"
              >
                お知らせ
              </Link>
              <Link
                href="mailto:tsreform.yukisaito@gmail.com"
                className="hover:underline text-white"
              >
                ご連絡はこちら
              </Link>
              <Link
                href="/jobApp"
                onClick={() => setOpen(false)}
                className="text-lg text-white"
              >
                協力業者募集！
              </Link>
            </div>
            {/* ▼ ログインだけ下に固定 */}

            <div className="p-4 space-y-4">
              {isLoggedIn && (
                <>
                  <Link
                    href="/postList"
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block text-center text-lg",
                      gradient ? "text-white" : "text-black"
                    )}
                  >
                    タイムライン
                  </Link>
                  <Link
                    href="/community"
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block text-center text-lg",
                      gradient ? "text-white" : "text-black"
                    )}
                  >
                    コミュニティ
                  </Link>
                  <Link
                    href="/analytics"
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block text-center text-lg",
                      gradient ? "text-white" : "text-black"
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
                  gradient ? "text-white" : "text-black" // ← ここで切り替え
                )}
              >
                Administrator Login
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
