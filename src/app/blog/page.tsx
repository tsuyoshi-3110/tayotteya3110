// app/blog/page.tsx
"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { BlogPost } from "@/types/blog";
import { useEffect, useState } from "react";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import BlogCard from "@/components/blog/BlogCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deleteObject, ref } from "firebase/storage";

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    const col = collection(db, "siteBlogs", SITE_KEY, "posts");
    const q = query(col, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr: BlogPost[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setPosts(arr);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (post: BlogPost) => {
    if (!SITE_KEY || !post?.id) return;
    if (!confirm("この記事を削除しますか？")) return;

    setDeletingId(post.id);
    try {
      // 1) Storage の実ファイル削除
      const medias = Array.isArray(post.media) ? post.media : [];
      for (const m of medias) {
        if (m?.path) {
          try {
            await deleteObject(ref(storage, m.path));
          } catch {
            // 個別失敗は続行（存在しない等）
          }
        }
      }

      // 2) Firestore ドキュメント削除
      await deleteDoc(doc(db, "siteBlogs", SITE_KEY, "posts", post.id));

      // 3) 楽観更新（即時反映）
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold  text-white text-outline">ブログ</h1>
        <Button asChild>
          <Link href="/blog/new">新規作成</Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだ投稿がありません。</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 justify-items-center">
          {posts.map((p) => (
            <BlogCard
              key={p.id}
              post={p}
              onDelete={handleDelete}
              deleting={deletingId === p.id}
              className="w-[90%]" // ✅ カードの横幅を 90%
            />
          ))}
        </div>
      )}
    </div>
  );
}
