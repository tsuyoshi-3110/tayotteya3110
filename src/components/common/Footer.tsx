// components/common/Footer.tsx
import Image from "next/image";
import ScrollUpCTA from "@/components/ScrollUpCTA";

export default function Footer() {
  const iconSize = 48;
  return (
    <footer className="relative z-20 mt-10 border-t bg-white/30 text-sm text-white text-outline backdrop-blur supports-[backdrop-filter]:bg-white/40">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* すべて中央寄せ */}
        <div className="flex flex-col items-center gap-6 text-center">
          {/* CTA */}
          <ScrollUpCTA
            href="/contact"
            label="無料相談・お問い合わせ"
            className="w-full max-w-xs sm:max-w-sm"
          />

          {/* SNSアイコン */}
          <nav
            className="flex items-center justify-center gap-5"
            aria-label="SNSリンク"
          >
            <a
              href="https://www.instagram.com/yuki.tayotte2017"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/instagram-logo.png"
                alt="Instagram"
                width={iconSize}
                height={iconSize}
                className="object-contain"
              />
            </a>
            <a
              href="https://lin.ee/YcKAJja"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LINE"
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/line-logo.png"
                alt="LINE"
                width={iconSize}
                height={iconSize}
                className="object-contain"
              />
            </a>
            <a
              href="https://tayotteya.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="公式サイト"
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/tayotteya_circle_image.png"
                alt="おそうじ処たよって屋"
                width={iconSize}
                height={iconSize}
                className="object-contain"
              />
            </a>
          </nav>

          {/* エリアリンク（SEO強化） */}
          <div className="space-y-1 text-xs leading-tight">
            <p>
              <a href="/areas/higashiyodogawa" className="hover:underline">
                東淀川区の家事代行・ハウスクリーニング
              </a>{" "}
            </p>
          </div>

          {/* コピーライト */}
          <div className="space-y-1">
            <p className="font-semibold leading-tight">おそうじ処 たよって屋</p>
            <p className="text-xs leading-tight">
              © {new Date().getFullYear()} Tayotteya. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
