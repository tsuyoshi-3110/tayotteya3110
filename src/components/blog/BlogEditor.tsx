// components/blog/BlogEditor.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import type { BlogBlock } from "@/types/blog";
import { useRouter } from "next/navigation";
import {
  ref as sref,
  deleteObject,
  getDownloadURL,
  uploadBytes,
} from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { THEMES, type ThemeKey } from "@/lib/themes";
import clsx from "clsx";
import BlockEditor from "./BlockEditor";
import { v4 as uuid } from "uuid";

/* ==========================
   テーマ（ダーク判定）
========================== */
const DARK_KEYS: ThemeKey[] = ["brandH", "brandG", "brandI"];

/* ==========================
   多言語ターゲット（jaはbaseで保持）
========================== */
const LANGS = [
  { key: "en", label: "英語" },
  { key: "zh", label: "中国語(簡体)" },
  { key: "zh-TW", label: "中国語(繁体)" },
  { key: "ko", label: "韓国語" },
  { key: "fr", label: "フランス語" },
  { key: "es", label: "スペイン語" },
  { key: "de", label: "ドイツ語" },
  { key: "pt", label: "ポルトガル語" },
  { key: "it", label: "イタリア語" },
  { key: "ru", label: "ロシア語" },
  { key: "th", label: "タイ語" },
  { key: "vi", label: "ベトナム語" },
  { key: "id", label: "インドネシア語" },
  { key: "hi", label: "ヒンディー語" },
  { key: "ar", label: "アラビア語" },
] as const;
type LangKey = (typeof LANGS)[number]["key"];

/* ==========================
   Firestore 保存用ユーティリティ
========================== */
function pruneUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(pruneUndefined) as unknown as T;
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = pruneUndefined(v);
    }
    return out as T;
  }
  return obj;
}

/* ==========================
   ブロック型ガード
========================== */
function blockHasKey(
  b: BlogBlock,
  key: "text" | "caption" | "title"
): b is BlogBlock & Record<typeof key, string> {
  return typeof (b as Record<string, unknown>)[key] === "string";
}
function isMedia(
  b: BlogBlock
): b is BlogBlock & {
  type: "image" | "video";
  path?: string;
  url?: string;
  title?: string;
  caption?: string;
} {
  return b.type === "image" || b.type === "video";
}

/* ==========================
   temp → posts/{id} に移動（baseのみ）
========================== */
async function moveTempToPost(
  postId: string,
  blocks: BlogBlock[],
  onProgress?: (pct: number, label: string) => void
): Promise<BlogBlock[]> {
  const targets = blocks.filter(
    (b: BlogBlock) =>
      isMedia(b) &&
      typeof b.path === "string" &&
      b.path.includes("/posts/temp/")
  );
  let moved = 0;
  const total = targets.length;

  const emit = (label: string) =>
    onProgress?.(total === 0 ? 100 : Math.round((moved / total) * 100), label);

  const result: BlogBlock[] = [];
  for (const b of blocks) {
    if (!isMedia(b) || !b.path || !b.path.includes("/posts/temp/")) {
      result.push(b);
      continue;
    }
    emit(`メディア移動中… ${moved + 1}/${total}`);
    const oldRef = sref(storage, b.path);
    const blob = await fetch(await getDownloadURL(oldRef)).then((r) => r.blob());
    const newPath = b.path.replace("/posts/temp/", `/posts/${postId}/`);
    const newRef = sref(storage, newPath);
    await uploadBytes(newRef, blob, { contentType: blob.type });
    const newUrl = await getDownloadURL(newRef);
    try {
      await deleteObject(oldRef);
    } catch {}
    result.push({ ...(b as Record<string, unknown>), path: newPath, url: newUrl } as BlogBlock);
    moved++;
    emit(`メディア移動中… ${moved}/${total}`);
  }
  emit("最終処理中…");
  return result;
}

/* ==========================
   翻訳：原文→指定言語（ブロック構造を維持して上書き生成）
========================== */
type TranslatedPost = { lang: LangKey; title: string; blocks: BlogBlock[] };

async function translatePost(
  baseTitle: string,
  baseBlocks: BlogBlock[],
  target: LangKey
): Promise<TranslatedPost> {
  // 線形化
  const SEP = "\n---\n";
  const items: Array<
    { kind: "title" } | { kind: "text"; idx: number } | { kind: "caption"; idx: number } | { kind: "mediaTitle"; idx: number }
  > = [];
  const payload: string[] = [];

  if (baseTitle.trim()) {
    items.push({ kind: "title" });
    payload.push(baseTitle);
  }

  baseBlocks.forEach((b, idx) => {
    if (blockHasKey(b, "text") && b.text.trim()) {
      items.push({ kind: "text", idx });
      payload.push(b.text);
    }
    if (blockHasKey(b, "caption") && b.caption.trim()) {
      items.push({ kind: "caption", idx });
      payload.push(b.caption);
    }
    if (isMedia(b) && blockHasKey(b, "title") && b.title.trim()) {
      items.push({ kind: "mediaTitle", idx });
      payload.push(b.title);
    }
  });

  if (payload.length === 0) {
    return { lang: target, title: baseTitle, blocks: baseBlocks };
  }

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "", body: payload.join(SEP), target }),
  });
  if (!res.ok) throw new Error("翻訳APIエラー");
  const data = (await res.json()) as { body?: string };
  const parts = String(data.body ?? "").split(SEP);

  // 再構築（上書き）
  let p = 0;
  let tTitle = baseTitle;
  const outBlocks: BlogBlock[] = baseBlocks.map((b) => ({ ...b }));

  if (items[0]?.kind === "title") {
    tTitle = (parts[p++] ?? "").trim() || baseTitle;
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === "title") continue;
    const translated = (parts[p++] ?? "").trim();
    if (!translated) continue;
    const idx = it.idx!;
    const b = outBlocks[idx] as Record<string, unknown>;
    if (it.kind === "text") b.text = translated;
    if (it.kind === "caption") b.caption = translated;
    if (it.kind === "mediaTitle") b.title = translated;
  }

  return { lang: target, title: tTitle, blocks: outBlocks };
}

/* ==========================
   コンポーネント
========================== */
type Props = { postId?: string };

export default function BlogEditor({ postId }: Props) {
  const router = useRouter();

  // 原文（日本語）
  const [title, setTitle] = useState<string>("");
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);

  // 保存/削除 進捗
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    open: boolean;
    pct: number;
    label: string;
  }>({ open: false, pct: 0, label: "" });

  // テーマ（進捗モーダルの見栄えに使用）
  const gradient = useThemeGradient();
  const isDark = useMemo(() => {
    if (!gradient) return false;
    return (Object.keys(THEMES) as ThemeKey[]).some(
      (k) => THEMES[k] === gradient && DARK_KEYS.includes(k)
    );
  }, [gradient]);

  /* 既存読み込み（互換対応） */
  useEffect(() => {
    if (!postId) return;
    (async () => {
      const refDoc = doc(db, "siteBlogs", SITE_KEY, "posts", postId);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) return;
      const d = snap.data() as any;

      // base
      const baseTitle: string =
        (d.base?.title as string) ?? (d.title as string) ?? "";
      let baseBlocks: BlogBlock[] = Array.isArray(d.base?.blocks)
        ? (d.base.blocks as BlogBlock[])
        : Array.isArray(d.blocks)
        ? (d.blocks as BlogBlock[])
        : [];

      // レガシー body/media → blocks 変換
      if (!baseBlocks || baseBlocks.length === 0) {
        const tmp: BlogBlock[] = [];
        const bodyText = String(d.body || "");
        if (bodyText) tmp.push({ id: uuid(), type: "p", text: bodyText } as BlogBlock);
        const medias = Array.isArray(d.media) ? (d.media as BlogBlock[]) : [];
        for (const m of medias) tmp.push({ id: uuid(), ...(m as object) } as BlogBlock);
        if (tmp.length === 0) tmp.push({ id: uuid(), type: "p", text: "" } as BlogBlock);
        baseBlocks = tmp;
      }

      setTitle(baseTitle);
      setBlocks(baseBlocks);
    })();
  }, [postId]);

  /* ========== 保存（新規/更新） ========== */
  const save = async () => {
    if (!title.trim()) {
      alert("タイトルを入力してください。");
      return;
    }
    setBusy(true);
    setProgress({ open: true, pct: 5, label: "準備中…" });
    try {
      if (postId) {
        // 既存更新：まずメディアを temp → posts/{id} へ
        const moved = await moveTempToPost(postId, blocks, (pct, label) =>
          setProgress({
            open: true,
            pct: Math.max(10, Math.min(80, pct)),
            label,
          })
        );

        // 全言語翻訳（常に再生成して上書き）
        setProgress({ open: true, pct: 85, label: "全言語へ翻訳中…" });
        const tAll: TranslatedPost[] = await Promise.all(
          (LANGS.map((l) => l.key) as LangKey[]).map((lang) =>
            translatePost(title, moved, lang)
          )
        );

        // 互換 body（段落テキストを連結）
        const plain = moved
          .filter((b) => blockHasKey(b, "text"))
          .map((b) => (b as { text: string }).text || "")
          .join("\n\n")
          .trim();

        setProgress({ open: true, pct: 95, label: "保存中…" });
        await updateDoc(
          doc(db, "siteBlogs", SITE_KEY, "posts", postId),
          pruneUndefined({
            base: { title, blocks: moved }, // ja は base
            t: tAll, // ★ すべて上書き
            // 互換フィールド
            title,
            body: plain,
            blocks: moved,
            updatedAt: serverTimestamp(),
          })
        );

        setProgress({ open: true, pct: 100, label: "完了" });
      } else {
        // 新規作成
        setProgress({ open: true, pct: 10, label: "記事を作成中…" });
        const created = await addDoc(
          collection(db, "siteBlogs", SITE_KEY, "posts"),
          {
            base: { title: title || "", blocks: [] as BlogBlock[] },
            t: [] as TranslatedPost[],
            title: title || "",
            body: "",
            blocks: [] as BlogBlock[],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        const moved = await moveTempToPost(created.id, blocks, (pct, label) =>
          setProgress({
            open: true,
            pct: 10 + Math.round((pct / 100) * 60),
            label,
          })
        );

        setProgress({ open: true, pct: 75, label: "全言語へ翻訳中…" });
        const tAll: TranslatedPost[] = await Promise.all(
          (LANGS.map((l) => l.key) as LangKey[]).map((lang) =>
            translatePost(title, moved, lang)
          )
        );

        const plain = moved
          .filter((b) => blockHasKey(b, "text"))
          .map((b) => (b as { text: string }).text || "")
          .join("\n\n")
          .trim();

        setProgress({ open: true, pct: 95, label: "保存中…" });
        await updateDoc(
          created,
          pruneUndefined({
            base: { title, blocks: moved },
            t: tAll, // ★ 全言語を保存
            title,
            body: plain,
            blocks: moved,
            updatedAt: serverTimestamp(),
          })
        );

        setProgress({ open: true, pct: 100, label: "完了" });
      }

      setTimeout(() => {
        setProgress({ open: false, pct: 0, label: "" });
        router.push("/blog");
      }, 400);
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました。");
      setProgress({ open: false, pct: 0, label: "" });
    } finally {
      setBusy(false);
    }
  };

  /* ========== 削除（メディアも） ========== */
  const remove = async () => {
    if (!postId) return;
    if (!confirm("この記事を削除しますか？（メディアも削除されます）")) return;
    setBusy(true);
    setProgress({ open: true, pct: 20, label: "削除中…" });
    try {
      for (const b of blocks) {
        if (isMedia(b) && b.path) {
          try {
            await deleteObject(sref(storage, b.path));
          } catch {}
        }
      }
      await deleteDoc(doc(db, "siteBlogs", SITE_KEY, "posts", postId));
      setProgress({ open: true, pct: 100, label: "完了" });
      setTimeout(() => {
        setProgress({ open: false, pct: 0, label: "" });
        router.push("/blog");
      }, 300);
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました。");
      setProgress({ open: false, pct: 0, label: "" });
    } finally {
      setBusy(false);
    }
  };

  /* ==========================
     UI
  ========================== */
  return (
    <div
      className={clsx(
        "space-y-6 bg-white/20 rounded-2xl shadow",
        isDark ? "text-white" : "text-black"
      )}
    >
      <div className="p-5">
        {/* タイトル */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">タイトル（原文）</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル"
            className={isDark ? "text-white" : "text-black"}
            disabled={busy}
          />
        </div>

        {/* 操作 */}
        <div className="flex items-center gap-2 mt-5 mb-5">
          <Button onClick={save} disabled={busy}>
            {postId ? "更新（全言語上書き）" : "公開（全言語作成）"}
          </Button>
          {postId && (
            <Button variant="destructive" onClick={remove} disabled={busy}>
              削除
            </Button>
          )}
        </div>

        {/* 本文エディタ（原文） */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">本文（原文ブロック）</label>
          <BlockEditor
            value={blocks}
            onChange={setBlocks}
            postIdForPath={postId ?? null}
          />
        </div>
      </div>

      {/* 保存/削除 進捗モーダル */}
      {progress.open && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50">
          <div
            className={clsx(
              "w-[92%] max-w-md rounded-2xl p-5 shadow-xl",
              isDark ? "bg-gray-900 text-white" : "bg-white text-black"
            )}
          >
            <div className="mb-3 text-base font-semibold">
              {progress.label}
            </div>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, progress.pct))}%` }}
              />
            </div>
            <div
              className={clsx(
                "text-right text-xs tabular-nums",
                isDark ? "text-white/70" : "text-gray-500"
              )}
            >
              {Math.max(0, Math.min(100, progress.pct))}%
            </div>
            <div className="mt-2 text-xs opacity-70">
              画面を閉じずにお待ちください…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
