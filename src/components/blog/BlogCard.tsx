// components/blog/BlogCard.tsx
"use client";

import { BlogPost } from "@/types/blog";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import clsx from "clsx";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { THEMES, ThemeKey } from "@/lib/themes";

// ProductMedia を使っていない場合は、下の <img>/<video> に置き換えてください
import ProductMedia from "@/components/ProductMedia";

type Props = {
  post: BlogPost;
  onDelete?: (post: BlogPost) => Promise<void> | void;
  deleting?: boolean;
  className?: string;
};

const DARK_KEYS: ThemeKey[] = ["brandG", "brandH", "brandI"];

export default function BlogCard({
  post,
  onDelete,
  deleting,
  className,
}: Props) {
  // グラデーション（テーマ）取得
  const gradient = useThemeGradient();
  const gradientClass = typeof gradient === "string" ? gradient : "";

  // ダーク系テーマ判定
  const isDark = !!gradient && DARK_KEYS.some((k) => THEMES[k] === gradientClass);

  // blocks（新仕様）優先、無ければ旧仕様 body/media を整形して擬似ブロックに
  const allBlocks: any[] = Array.isArray((post as any).blocks)
    ? (post as any).blocks
    : (() => {
        const tmp: any[] = [];
        if ((post as any).body) tmp.push({ type: "p", text: (post as any).body });
        if (Array.isArray((post as any).media)) {
          for (const m of (post as any).media) tmp.push(m);
        }
        return tmp;
      })();

  return (
    <article
      className={clsx(
        "overflow-hidden rounded-2xl shadow transition w-full",
        gradientClass ? `bg-gradient-to-br ${gradientClass}` : "bg-white",
        isDark ? "border border-white/10 hover:shadow-md"
               : "border border-black/10 hover:shadow-md",
        className
      )}
    >
      {/* タイトル行 */}
      <div className={clsx("p-4 pb-2", isDark ? "text-white" : "text-black")}>
        <h3 className={clsx("font-semibold leading-snug text-2xl",
                            isDark ? "text-white" : "text-black")}>
          {post.title}
        </h3>
        <div
          className={clsx(
            "mt-1 text-xs",
            isDark ? "text-white/70" : "text-gray-500"
          )}
        >
          {post.createdAt?.toDate
            ? format(post.createdAt.toDate(), "yyyy/MM/dd HH:mm", { locale: ja })
            : ""}
        </div>
      </div>

      {/* 本文：全ブロック描画（テキスト省略なし・画像/動画はすべて表示） */}
      <div className={clsx("px-4 pb-4 space-y-4", isDark ? "text-white" : "text-black")}>
        {allBlocks.map((b, i) => {
          if (b?.type === "p") {
            return (
              <p
                key={`p-${i}`}
                className={clsx(
                  "whitespace-pre-wrap leading-relaxed text-sm",
                  isDark ? "text-white/85" : "text-gray-800"
                )}
              >
                {b.text || ""}
              </p>
            );
          }
          if (b?.type === "image" && b?.url) {
            return (
              <div key={`img-${i}`} className="overflow-hidden rounded-2xl border border-black/10">
                {/* ProductMedia を使わない場合:
                    <img src={b.url} alt={b.alt || ""} className="w-full object-contain bg-black/5" />
                 */}
                <ProductMedia
                  src={b.url}
                  type="image"
                  className="w-full rounded-2xl"
                />
                {b.alt ? (
                  <div className={clsx("px-2 py-1 text-xl", isDark ? "text-white/70" : "text-black")}>
                    {b.alt}
                  </div>
                ) : null}
              </div>
            );
          }
          if (b?.type === "video" && b?.url) {
            return (
              <div key={`vid-${i}`} className="overflow-hidden rounded-2xl border border-black/10">
                {/* ProductMedia を使わない場合:
                    <video src={b.url} controls playsInline className="w-full bg-black/5" />
                 */}
                <ProductMedia
                  src={b.url}
                  type="video"
                  className="w-full rounded-2xl"
                />
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* 操作行 */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <Button asChild size="sm" variant={isDark ? "secondary" : "default"}>
          <Link href={`/blog/${post.id}/edit`}>
            <Pencil className="mr-1.5 h-4 w-4" />
            編集
          </Link>
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete?.(post)}
          disabled={deleting}
        >
          <Trash className="mr-1.5 h-4 w-4" />
          {deleting ? "削除中…" : "削除"}
        </Button>
      </div>
    </article>
  );
}
