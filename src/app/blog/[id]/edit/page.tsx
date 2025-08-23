
// app/blog/[id]/edit/page.tsx
// app/blog/[id]/edit/page.tsx
"use client";

import { useParams } from "next/navigation";
import BlogEditor from "@/components/blog/BlogEditor";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { THEMES, ThemeKey } from "@/lib/themes";

const DARK_KEYS: ThemeKey[] = ["brandH", "brandG", "brandI"];

export default function BlogEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const gradient = useThemeGradient();
  const isDark =
    gradient &&
    DARK_KEYS.includes(
      Object.keys(THEMES).find(
        (k) => THEMES[k as ThemeKey] === gradient
      ) as ThemeKey
    );

  const textColorClass = isDark ? "text-white" : "text-black";

  if (!id) return null;

  return (
    <div className={`max-w-3xl mx-auto p-4 space-y-6 ${textColorClass}`}>
      <h1 className="text-xl font-bold">投稿を編集</h1>
      <BlogEditor postId={id} />
    </div>
  );
}
