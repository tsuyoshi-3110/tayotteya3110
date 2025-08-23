// app/blog/page.tsx
"use client";

import {
  collection,
  query,
  orderBy,
  limit as fbLimit,
  getDocs,
  startAfter,
  doc,
  deleteDoc,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { BlogPost } from "@/types/blog";
import { useCallback, useEffect, useRef, useState } from "react";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import BlogCard from "@/components/blog/BlogCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deleteObject, ref as storageRef } from "firebase/storage";

const PAGE_SIZE = 20;

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [cursor, setCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (firstLoad = false) => {
      if (!SITE_KEY || loading || noMore) return;
      setLoading(true);
      try {
        const col = collection(db, "siteBlogs", SITE_KEY, "posts");
        const base = query(
          col,
          orderBy("createdAt", "desc"),
          fbLimit(PAGE_SIZE)
        );

        const q = cursor
          ? query(
              col,
              orderBy("createdAt", "desc"),
              startAfter(cursor),
              fbLimit(PAGE_SIZE)
            )
          : base;

        const snap = await getDocs(q);
        if (snap.empty) {
          setNoMore(true);
          return;
        }

        const items: BlogPost[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        setPosts((prev) => (firstLoad ? items : [...prev, ...items]));

        // 次ページ用のカーソルを最後のドキュメントに更新
        setCursor(snap.docs[snap.docs.length - 1] ?? null);

        // もし取得数が PAGE_SIZE 未満ならもう終わり
        if (snap.size < PAGE_SIZE) setNoMore(true);
      } finally {
        setLoading(false);
      }
    },
    [cursor, loading, noMore]
  );

  // 初回ロード
  useEffect(() => {
    setPosts([]);
    setCursor(null);
    setNoMore(false);
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SITE_KEY]);

  // 無限スクロール（画面下の番兵が見えたら次のページを取得）
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting) {
          fetchPage(false);
        }
      },
      { rootMargin: "200px 0px" } // 余裕を持って事前ロード
    );

    io.observe(el);
    return () => io.disconnect();
  }, [fetchPage]);

  // 削除
  const handleDelete = async (post: BlogPost) => {
    if (!SITE_KEY || !post?.id) return;
    if (!confirm("この記事を削除しますか？（メディアも削除されます）")) return;

    setDeletingId(post.id);
    try {
      // Storage の実ファイル削除
      const medias = Array.isArray(post.media) ? post.media : [];
      for (const m of medias) {
        if (m?.path) {
          try {
            await deleteObject(storageRef(storage, m.path));
          } catch {
            // 存在しない等は無視
          }
        }
      }
      // Firestore ドキュメント削除
      await deleteDoc(doc(db, "siteBlogs", SITE_KEY, "posts", post.id));
      // ローカル一覧から即時除去
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white text-outline">ブログ</h1>
        <Button asChild>
          <Link href="/blog/new">新規作成</Link>
        </Button>
      </div>

      {posts.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">まだ投稿がありません。</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-1 justify-items-center">
            {posts.map((p) => (
              <BlogCard
                key={p.id}
                post={p}
                onDelete={handleDelete}
                deleting={deletingId === p.id}
                className="w-[90%]" // ← 表示領域を約90%に
              />
            ))}
          </div>

          {/* ローディング／終端メッセージ */}
          <div className="flex justify-center py-4 text-sm text-muted-foreground">
            {loading ? "読み込み中…" : noMore ? "すべて読み込みました" : ""}
          </div>

          {/* 無限スクロール用の番兵 */}
          <div ref={sentinelRef} className="h-6" />
        </>
      )}
    </div>
  );
}
