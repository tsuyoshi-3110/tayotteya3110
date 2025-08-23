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

export default function BlogCard({
  post,
  onDelete,
  deleting,
  className,
}: Props) {
  const first =
    Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : null;

  // Firestoreの設定からグラデーションを取得
  const gradient = useThemeGradient();

  const gradientClass = typeof gradient === "string" ? gradient : "";

  const isGradient = Boolean(gradientClass);

  // ---- ダーク系キー判定 ----
  const darkKeys: ThemeKey[] = ["brandH", "brandG", "brandI"];
  const isDark =
    gradient &&
    darkKeys.includes(
      Object.keys(THEMES).find(
        (k) => THEMES[k as ThemeKey] === gradientClass
      ) as ThemeKey
    );

  return (
    <article
      className={clsx(
        "rounded-2xl border shadow-sm hover:shadow transition overflow-hidden",
        isGradient ? `bg-gradient-to-br ${gradientClass}` : "bg-white",
        className
      )}
    >
      {/* プレビュー（角丸は上辺だけ） */}
      {first?.url && first?.type && (
        <ProductMedia
          src={first.url}
          type={first.type}
          className="w-full rounded-t-2xl"
        />
      )}

      <div className="p-4 space-y-3">
        <h3
          className={clsx(
            "font-semibold text-base leading-snug",
            isDark ? "text-white" : "text-black"
          )}
        >
          {post.title}
        </h3>

        {post.body && (
          <p
            className={clsx(
              "text-sm", // サイズ
              isDark ? "text-white/80" : "text-gray-700" // ✅ 背景に応じて切替
            )}
          >
            {post.body}
          </p>
        )}

        <div
          className={clsx(
            "text-xs",
            isDark ? "text-white/70" : "text-gray-500"
          )}
        >
          {post.createdAt?.toDate
            ? format(post.createdAt.toDate(), "yyyy/MM/dd HH:mm", {
                locale: ja,
              })
            : ""}
        </div>

        <div className="pt-2 flex items-center gap-2">
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
      </div>
    </article>
  );
}
