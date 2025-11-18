// components/common/Footer.tsx

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-20 mt-10 border-t bg-white/30 text-sm text-white text-outline backdrop-blur supports-[backdrop-filter]:bg-white/40">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* すべて中央寄せ */}
        <div className="flex flex-col items-center gap-6 text-center">
          {/* リンク（ロゴ） */}
          <nav
            className="flex items-center justify-center gap-5"
            aria-label="サイトリンク"
          >
            <Link
              href="https://daiko-siko.com/"
              className={clsx("text-xl font-bold flex items-center gap-2 py-2 hover:opacity-50")}
            >
              <Image
                src="/images/backImage.png"
                alt="D.s.Lab Home"
                width={48}
                height={48}
                className="w-10 h-10 object-contain transition-opacity duration-200 mr-2 rounded"
                unoptimized
              />
            </Link>
          </nav>

          {/* エリアリンク（SEO強化） */}
          {/* <div className="space-y-1 text-xs leading-tight">
            <p>
              <Link href="/areas/local" className="hover:underline">
                門真市の段ボール・パッケージ提案
              </Link>
            </p>
          </div> */}

          {/* 連絡先 */}
          <div className="space-y-1 text-xs leading-tight">
            <p>〒571-000 大阪府門真市北岸和田2-1-12</p>
            <p>TEL：072-882-0154 ／ Mail：d.s.lab.571@gmail.com</p>
          </div>

          {/* コピーライト */}
          <div className="space-y-1">
            <p className="font-semibold leading-tight">D.s.Lab</p>
            <p className="text-xs leading-tight">
              © {new Date().getFullYear()} D.s.Lab. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
