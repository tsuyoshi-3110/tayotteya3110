
// app/blog/[id]/edit/page.tsx
"use client";

import { useParams } from "next/navigation";
import BlogEditor from "@/components/blog/BlogEditor";

export default function BlogEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  if (!id) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold">投稿を編集</h1>
      <BlogEditor postId={id} />
    </div>
  );
}
