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
import { BlogBlock, BlogMedia } from "@/types/blog";
import { useRouter } from "next/navigation";
import {
  ref,
  deleteObject,
  getDownloadURL,
  uploadBytes,
} from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { THEMES, ThemeKey } from "@/lib/themes";
import clsx from "clsx";
import BlockEditor from "./BlockEditor";
import { v4 as uuid } from "uuid";

// ダーク系テーマキー（白文字にしたいテーマ）
const DARK_KEYS: ThemeKey[] = ["brandH", "brandG", "brandI"];

type Props = { postId?: string };

/** Firestore 用に undefined を除去 */
function pruneUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(pruneUndefined) as any;
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = pruneUndefined(v as any);
    }
    return out;
  }
  return obj as any;
}

/** blocks 内の temp メディアを posts/{postId}/ へ移動して置換 */
async function moveTempBlocksToPostId(
  postId: string,
  blocks: BlogBlock[]
): Promise<BlogBlock[]> {
  const out: BlogBlock[] = [];
  for (const b of blocks) {
    if (b.type === "image" || b.type === "video") {
      const path = (b as any).path as string | undefined;
      if (path && path.includes("/posts/temp/")) {
        const oldRef = ref(storage, path);
        const blob = await fetch(await getDownloadURL(oldRef)).then((r) =>
          r.blob()
        );
        const newPath = path.replace("/posts/temp/", `/posts/${postId}/`);
        const newRef = ref(storage, newPath);
        await uploadBytes(newRef, blob, { contentType: blob.type });
        const newUrl = await getDownloadURL(newRef);
        try {
          await deleteObject(oldRef);
        } catch {}
        out.push({ ...(b as any), path: newPath, url: newUrl });
        continue;
      }
    }
    out.push(b);
  }
  return out;
}

export default function BlogEditor({ postId }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [loading, setLoading] = useState(false);

  // --- AI 生成モーダル用 state ---
  const [genOpen, setGenOpen] = useState(false);
  const [kw1, setKw1] = useState("");
  const [kw2, setKw2] = useState("");
  const [kw3, setKw3] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genInsertMode, setGenInsertMode] = useState<"append" | "replace">(
    "append"
  );

  // --- AI 校正モーダル用 state ---
  const [proofOpen, setProofOpen] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofText, setProofText] = useState(""); // 校正結果（編集可）

  // ▼ 現在のテーマ背景を取得
  const gradient = useThemeGradient();
  const isDark =
    gradient &&
    DARK_KEYS.includes(
      Object.keys(THEMES).find(
        (k) => THEMES[k as ThemeKey] === gradient
      ) as ThemeKey
    );

  const textColorClass = isDark ? "text-white" : "text-black";

  // 現在のテキスト本文（テキストブロックを連結）
  const joinedText = useMemo(
    () =>
      blocks
        .filter((b) => b.type === "p")
        .map((b: any) => b.text || "")
        .join("\n\n")
        .trim(),
    [blocks]
  );

  // キーワード配列 & 生成可否
  const keywords = [kw1.trim(), kw2.trim(), kw3.trim()]
    .filter(Boolean)
    .slice(0, 3);
  const canGenerate = title.trim().length > 0 && keywords.length > 0;

  // キーワードリセット & モーダルクローズユーティリティ
  const resetKeywords = () => {
    setKw1("");
    setKw2("");
    setKw3("");
  };
  const closeGenModal = (shouldReset = true) => {
    if (shouldReset) resetKeywords();
    setGenOpen(false);
  };

  // 編集時ロード（後方互換：body/media → blocks 化）
  useEffect(() => {
    if (!postId) return;
    (async () => {
      const refDoc = doc(db, "siteBlogs", SITE_KEY, "posts", postId);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const d = snap.data() as any;
        setTitle(d.title ?? "");
        if (Array.isArray(d.blocks) && d.blocks.length) {
          setBlocks(d.blocks);
        } else {
          const tmp: BlogBlock[] = [];
          const bodyText = String(d.body || "");
          if (bodyText) tmp.push({ id: uuid(), type: "p", text: bodyText });
          const medias = Array.isArray(d.media) ? (d.media as BlogMedia[]) : [];
          for (const m of medias) {
            tmp.push({ id: uuid(), ...(m as any) });
          }
          if (tmp.length === 0) tmp.push({ id: uuid(), type: "p", text: "" });
          setBlocks(tmp);
        }
      }
    })();
  }, [postId]);

  // 本文生成（モーダルから呼ぶ）: 常に1つのテキストブロックだけ作成
  const generateBody = async () => {
    if (!canGenerate) return;
    setGenLoading(true);
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), keywords }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "本文の生成に失敗しました。");
        return;
      }

      const text = String(data.body || "").trim();
      if (!text) {
        alert("生成結果が空でした。");
        return;
      }

      if (genInsertMode === "replace") {
        // 最初のテキストブロックを1つの本文で置き換え（無ければ末尾に作成）
        const idx = blocks.findIndex((b) => b.type === "p");
        const next = blocks.slice();
        if (idx >= 0) {
          next[idx] = { ...(next[idx] as any), text };
        } else {
          next.push({ id: uuid(), type: "p", text } as any);
        }
        setBlocks(next);
      } else {
        // 末尾に1つだけ追加
        setBlocks([...(blocks || []), { id: uuid(), type: "p", text } as any]);
      }

      closeGenModal(true);
    } catch (e: any) {
      alert(e?.message ?? "本文の生成に失敗しました。");
    } finally {
      setGenLoading(false);
    }
  };

  // 本文の AI 校正を取得（テキストブロックを結合して送る）
  const fetchProofread = async () => {
    const source = joinedText;
    if (!source) {
      alert("本文が空です。校正するテキストを入力してください。");
      return;
    }
    setProofLoading(true);
    try {
      const res = await fetch("/api/blog/proofread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: source }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "校正に失敗しました。");
        return;
      }
      setProofText(String(data.body || ""));
      setProofOpen(true);
    } catch (e: any) {
      alert(e?.message ?? "校正に失敗しました。");
    } finally {
      setProofLoading(false);
    }
  };

  // 校正モーダル：置き換え確定（最初のテキストブロックに流し込む。無ければ追加）
  const applyProof = () => {
    const idx = blocks.findIndex((b) => b.type === "p");
    if (idx >= 0) {
      const next = blocks.slice();
      next[idx] = { ...(next[idx] as any), text: proofText };
      setBlocks(next);
    } else {
      setBlocks([...(blocks || []), { id: uuid(), type: "p", text: proofText }]);
    }
    setProofText("");
    setProofOpen(false);
  };

  // 校正モーダル：キャンセル
  const cancelProof = () => {
    setProofText("");
    setProofOpen(false);
  };

  // 保存
  const save = async () => {
    if (!title.trim()) {
      alert("タイトルを入力してください。");
      return;
    }
    setLoading(true);
    try {
      if (postId) {
        // 既存更新：blocks の temp を移動してから保存
        const moved = await moveTempBlocksToPostId(postId, blocks);
        const plain = moved
          .filter((b) => b.type === "p")
          .map((b: any) => b.text || "")
          .join("\n\n")
          .trim();
        const refDoc = doc(db, "siteBlogs", SITE_KEY, "posts", postId);
        await updateDoc(refDoc, {
          title: title ?? "",
          body: plain, // 索引用のプレーンテキスト（任意）
          blocks: pruneUndefined(moved),
          updatedAt: serverTimestamp(),
        });
      } else {
        // 先に空ドキュメント → temp を移動 → 保存
        const created = await addDoc(
          collection(db, "siteBlogs", SITE_KEY, "posts"),
          {
            title: title ?? "",
            body: "",
            blocks: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
        const moved = await moveTempBlocksToPostId(created.id, blocks);
        const plain = moved
          .filter((b) => b.type === "p")
          .map((b: any) => b.text || "")
          .join("\n\n")
          .trim();
        await updateDoc(created, {
          body: plain,
          blocks: pruneUndefined(moved),
          updatedAt: serverTimestamp(),
        });
      }
      router.push("/blog");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 削除（編集画面のみ）
  const remove = async () => {
    if (!postId) return;
    if (!confirm("この記事を削除しますか？（メディアも削除されます）")) return;

    setLoading(true);
    try {
      for (const b of blocks) {
        if ((b.type === "image" || b.type === "video") && (b as any).path) {
          try {
            await deleteObject(ref(storage, (b as any).path));
          } catch {}
        }
      }
      await deleteDoc(doc(db, "siteBlogs", SITE_KEY, "posts", postId));
      router.push("/blog");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const isTitleEmpty = title.trim().length === 0;
  const isBodyEmpty = joinedText.length === 0;

  return (
    <div className={`space-y-6 ${textColorClass}`}>
      {/* タイトル */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">タイトル</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          className={textColorClass}
        />
      </div>

      {/* 本文（ブロックエディタ＋AI生成・AI校正のボタン） */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">本文（ブロック）</label>
        <BlockEditor
          value={blocks}
          onChange={setBlocks}
          postIdForPath={postId ?? null}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setGenOpen(true)}
            variant="secondary"
            disabled={isTitleEmpty}
          >
            AIで本文生成
          </Button>
          <Button
            type="button"
            onClick={fetchProofread}
            disabled={isBodyEmpty || proofLoading}
          >
            {proofLoading ? "校正中…" : "AIで校正"}
          </Button>
          <span
            className={clsx(
              "text-xs",
              isDark ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {isTitleEmpty
              ? "（タイトルを入力すると本文生成が使えます）"
              : "テキストブロックに生成/校正結果を反映します"}
          </span>
        </div>
      </div>

      {/* 操作ボタン群 */}
      <div className="flex gap-3">
        <Button onClick={save} disabled={loading}>
          {postId ? "更新" : "公開"}
        </Button>
        {postId && (
          <Button variant="destructive" onClick={remove} disabled={loading}>
            削除
          </Button>
        )}
      </div>

      {/* ====== 生成モーダル ====== */}
      {genOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeGenModal(true);
          }}
        >
          <div className="w-[92%] max-w-lg rounded-2xl bg-white p-6 shadow-xl text-black">
            <div className="mb-4">
              <div className="text-base font-semibold">AIで本文生成</div>
              <div className="mt-1 text-xs text-muted-foreground">
                タイトルはエディタで入力してください。キーワードは 1〜3 個入力できます（1つ以上で生成可）。生成結果は「1つの本文」として挿入されます。
              </div>
            </div>

            <div className="grid gap-2 mb-5">
              <label className="text-xs font-medium">キーワード（最大3）</label>
              <div className="flex flex-col gap-2">
                <Input value={kw1} onChange={(e) => setKw1(e.target.value)} />
                <Input value={kw2} onChange={(e) => setKw2(e.target.value)} />
                <Input value={kw3} onChange={(e) => setKw3(e.target.value)} />
              </div>
            </div>

            {/* 挿入方法（1本文を追加 or 置き換え） */}
            <div className="mb-4 space-y-3">
              <div className="text-xs font-medium">挿入方法</div>
              <div className="flex flex-col gap-1 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="genInsertMode"
                    checked={genInsertMode === "append"}
                    onChange={() => setGenInsertMode("append")}
                  />
                  末尾に追加（1本文）
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="genInsertMode"
                    checked={genInsertMode === "replace"}
                    onChange={() => setGenInsertMode("replace")}
                  />
                  最初のテキストブロックを置き換え（1本文）
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => closeGenModal(true)}
                disabled={genLoading}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={generateBody}
                disabled={!canGenerate || genLoading}
              >
                {genLoading ? "生成中…" : "生成する"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ====== 校正モーダル ====== */}
      {proofOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelProof();
          }}
        >
          <div className="w-[92%] max-w-2xl rounded-2xl bg-white p-6 shadow-xl text-black">
            <div className="mb-4">
              <div className="text-base font-semibold">AIで校正</div>
              <div className="mt-1 text-xs text-muted-foreground">
                下の内容を確認して「置き換える」を押すと本文に反映されます。
              </div>
            </div>

            <div className="grid gap-2 mb-5">
              <label className="text-xs font-medium">校正結果</label>
              <Textarea
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                rows={14}
                placeholder="校正結果がここに表示されます"
                className="text-black"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" type="button" onClick={cancelProof}>
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={applyProof}
                disabled={!proofText.trim()}
              >
                置き換える
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
