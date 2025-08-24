// components/blog/BlogEditor.tsx
"use client";

import { useEffect, useState } from "react";
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
import { BlogMedia } from "@/types/blog";
import MediaUploader from "./MediaUploader";
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
  return obj;
}

/** temp 配下のメディアを posts/{postId}/ にコピーし、URL を再発行して返す */
async function moveTempMediasToPostId(
  postId: string,
  medias: BlogMedia[]
): Promise<BlogMedia[]> {
  const result: BlogMedia[] = [];

  for (const m of medias) {
    if (!m.path || !m.path.includes("/posts/temp/")) {
      result.push(m);
      continue;
    }

    const oldRef = ref(storage, m.path);
    const blob = await fetch(await getDownloadURL(oldRef)).then((r) =>
      r.blob()
    );

    const newPath = m.path.replace("/posts/temp/", `/posts/${postId}/`);
    const newRef = ref(storage, newPath);
    await uploadBytes(newRef, blob, { contentType: blob.type });

    const newUrl = await getDownloadURL(newRef);

    result.push({
      ...m,
      path: newPath,
      url: newUrl,
    });

    try {
      await deleteObject(oldRef);
    } catch {}
  }

  return result;
}

export default function BlogEditor({ postId }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<BlogMedia[]>([]);
  const [loading, setLoading] = useState(false);

  // --- AI 生成モーダル用 state ---
  const [genOpen, setGenOpen] = useState(false);
  const [kw1, setKw1] = useState("");
  const [kw2, setKw2] = useState("");
  const [kw3, setKw3] = useState("");
  const [genLoading, setGenLoading] = useState(false);

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

  // 編集時ロード
  useEffect(() => {
    if (!postId) return;
    (async () => {
      const refDoc = doc(db, "siteBlogs", SITE_KEY, "posts", postId);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const d = snap.data() as any;
        setTitle(d.title ?? "");
        setBody(d.body ?? "");
        setMedia(Array.isArray(d.media) ? d.media : []);
      }
    })();
  }, [postId]);

  // 本文生成（モーダルから呼ぶ）
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
      setBody(data.body as string); // 上書き
      closeGenModal(true); // 生成成功 → キーワードを空にして閉じる
    } catch (e: any) {
      alert(e?.message ?? "本文の生成に失敗しました。");
    } finally {
      setGenLoading(false);
    }
  };

  // 本文の AI 校正を取得
  const fetchProofread = async () => {
    const source = body.trim();
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

  // 校正モーダル：置き換え確定
  const applyProof = () => {
    setBody(proofText);
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
    setLoading(true);
    try {
      if (postId) {
        // 既存更新
        const refDoc = doc(db, "siteBlogs", SITE_KEY, "posts", postId);
        await updateDoc(refDoc, {
          title: title ?? "",
          body: body ?? "",
          media: pruneUndefined(media),
          updatedAt: serverTimestamp(),
        });
      } else {
        // 新規：Doc 作成 → temp を移動 → URL 再発行 → 保存
        const created = await addDoc(
          collection(db, "siteBlogs", SITE_KEY, "posts"),
          {
            title: title ?? "",
            body: body ?? "",
            media: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        const movedMedias = await moveTempMediasToPostId(created.id, media);
        await updateDoc(created, {
          media: pruneUndefined(movedMedias),
          updatedAt: serverTimestamp(),
        });
      }

      router.push("/blog");
    } finally {
      setLoading(false);
    }
  };

  // 削除（編集画面のみ）
  const remove = async () => {
    if (!postId) return;
    if (!confirm("この記事を削除しますか？")) return;

    setLoading(true);
    try {
      for (const m of media) {
        if (m.path) {
          try {
            await deleteObject(ref(storage, m.path));
          } catch {}
        }
      }
      await deleteDoc(doc(db, "siteBlogs", SITE_KEY, "posts", postId));
      router.push("/blog");
    } finally {
      setLoading(false);
    }
  };

  const isTitleEmpty = title.trim().length === 0;
  const isBodyEmpty = body.trim().length === 0;

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

      {/* 本文（AI生成・AI校正のボタンあり） */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">本文</label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          placeholder="AIで自動生成するか、自由に入力してください。"
          className={textColorClass}
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
              : "キーワードを指定して自然な口語文を生成できます"}
          </span>
        </div>
      </div>

      {/* メディア */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">メディア（画像/動画）</label>
        <MediaUploader
          postIdForPath={postId}
          value={media}
          onChange={setMedia}
        />
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
                タイトルはエディタで入力してください。キーワードは 1〜3
                個入力できます（1つ以上で生成可）。
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
