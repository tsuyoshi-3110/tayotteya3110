// components/blog/BlogCard.tsx
"use client";

import { BlogPost } from "@/types/blog";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import ProductMedia from "@/components/ProductMedia";
import clsx from "clsx";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { THEMES, ThemeKey } from "@/lib/themes";

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
  const first =
    Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : null;

  // グラデーション（テーマ）取得
  const gradient = useThemeGradient();
  const gradientClass = typeof gradient === "string" ? gradient : "";

  // ダーク系テーマ判定
  const isDark =
    !!gradient &&
    DARK_KEYS.some((k) => THEMES[k] === gradientClass);

  return (
    <article
      className={clsx(
        "overflow-hidden rounded-2xl shadow transition",
        // 背景
        gradientClass ? `bg-gradient-to-br ${gradientClass}` : "bg-white",
        // 枠線は背景に応じて
        isDark ? "border border-white/10 hover:shadow-md"
               : "border border-black/10 hover:shadow-md",
        className
      )}
    >
      {/* プレビュー（上辺だけ角丸） */}
      {first?.url && first?.type && (
        <ProductMedia
          src={first.url}
          type={first.type}
          className="w-full rounded-t-2xl"
        />
      )}

      {/* 本文ブロック */}
      <div className={clsx("p-4 space-y-3", isDark ? "text-white" : "text-black")}>
        {/* タイトル */}
        <h3 className={clsx("font-semibold text-base leading-snug",
                            isDark ? "text-white" : "text-black")}>
          {post.title}
        </h3>

        {/* 本文（全文表示） */}
        {post.body && (
          <p
            className={clsx(
              "text-sm whitespace-pre-wrap leading-relaxed",
              isDark ? "text-white/85" : "text-gray-700"
            )}
          >
            {post.body}
          </p>
        )}

        {/* 日付 */}
        <div
          className={clsx(
            "text-xs",
            isDark ? "text-white/70" : "text-gray-500"
          )}
        >
          {post.createdAt?.toDate
            ? format(post.createdAt.toDate(), "yyyy/MM/dd HH:mm", { locale: ja })
            : ""}
        </div>

        {/* 操作行 */}
        <div className="pt-2 flex items-center gap-2">
          {/* ダーク背景では secondary のほうがコントラスト良い */}
          <Button
            asChild
            size="sm"
            variant={isDark ? "secondary" : "default"}
          >
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
      </div>
    </article>
  );
}
