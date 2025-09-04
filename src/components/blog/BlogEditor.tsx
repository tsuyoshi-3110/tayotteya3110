// components/blog/BlogEditor.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useThemeGradient } from "@/lib/useThemeGradient";
import { THEMES, ThemeKey } from "@/lib/themes";
import clsx from "clsx";
import BlockEditor from "./BlockEditor";
import { v4 as uuid } from "uuid";


/* ===============================
   ダークテーマ
================================ */
const DARK_KEYS: ThemeKey[] = ["brandH", "brandG", "brandI"];

/* ===============================
   翻訳対象言語（要求リスト）
================================ */
const LANGS = [
  { key: "en", label: "英語", emoji: "🇺🇸" },
  { key: "zh", label: "中国語(簡体)", emoji: "🇨🇳" },
  { key: "zh-TW", label: "中国語(繁体)", emoji: "🇹🇼" },
  { key: "ko", label: "韓国語", emoji: "🇰🇷" },
  { key: "fr", label: "フランス語", emoji: "🇫🇷" },
  { key: "es", label: "スペイン語", emoji: "🇪🇸" },
  { key: "de", label: "ドイツ語", emoji: "🇩🇪" },
  { key: "pt", label: "ポルトガル語", emoji: "🇵🇹" },
  { key: "it", label: "イタリア語", emoji: "🇮🇹" },
  { key: "ru", label: "ロシア語", emoji: "🇷🇺" },
  { key: "th", label: "タイ語", emoji: "🇹🇭" },
  { key: "vi", label: "ベトナム語", emoji: "🇻🇳" },
  { key: "id", label: "インドネシア語", emoji: "🇮🇩" },
  { key: "hi", label: "ヒンディー語", emoji: "🇮🇳" },
  { key: "ar", label: "アラビア語", emoji: "🇸🇦" },
] as const;
type LangKey = (typeof LANGS)[number]["key"];

/* ===============================
   Firestore 保存前に undefined 除去
================================ */
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

/* ===============================
   temp 配下のメディアを posts/{postId}/ へ移動
================================ */
async function moveTempBlocksToPostIdWithProgress(
  postId: string,
  blocks: BlogBlock[],
  onProgress?: (info: {
    moved: number;
    total: number;
    pct: number;
    label: string;
  }) => void
): Promise<BlogBlock[]> {
  const result: BlogBlock[] = [];
  const targets = blocks.filter(
    (b) =>
      (b.type === "image" || b.type === "video") &&
      typeof (b as any).path === "string" &&
      (b as any).path.includes("/posts/temp/")
  );
  const total = targets.length;

  let moved = 0;
  const emit = (label: string) => {
    const pct =
      total === 0 ? 100 : Math.min(100, Math.round((moved / total) * 100));
    onProgress?.({ moved, total, pct, label });
  };

  for (const b of blocks) {
    if (!(b.type === "image" || b.type === "video")) {
      result.push(b);
      continue;
    }
    const path = (b as any).path as string | undefined;
    if (!path || !path.includes("/posts/temp/")) {
      result.push(b);
      continue;
    }

    emit(`メディア移動中… ${moved + 1}/${total}`);
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

    result.push({ ...(b as any), path: newPath, url: newUrl });
    moved++;
    emit(`メディア移動中… ${moved}/${total}`);
  }

  emit("最終処理中…");
  return result;
}

/* ===============================
   本体
================================ */
type Props = { postId?: string };

export default function BlogEditor({ postId }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [loading, setLoading] = useState(false);

  // 保存/削除 進捗モーダル
  const [saveModal, setSaveModal] = useState<{
    open: boolean;
    pct: number;
    label: string;
    sub?: string;
  }>({ open: false, pct: 0, label: "" });

  const openSaveModal = (label: string, pct = 0, sub?: string) =>
    setSaveModal({ open: true, pct, label, sub });
  const updateSaveModal = (patch: Partial<typeof saveModal>) =>
    setSaveModal((s) => ({ ...s, ...patch }));
  const closeSaveModal = () => setSaveModal({ open: false, pct: 0, label: "" });

  // テーマ
  const gradient = useThemeGradient();
  const isDark =
    gradient &&
    DARK_KEYS.includes(
      (Object.keys(THEMES).find(
        (k) => THEMES[k as ThemeKey] === gradient
      ) as ThemeKey) ?? "brandA"
    );
  const textColorClass = isDark ? "text-white" : "text-black";

  // 既存読み込み
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
          // 後方互換：body/media を blocks に詰め替え
          const tmp: BlogBlock[] = [];
          const bodyText = String(d.body || "");
          if (bodyText) tmp.push({ id: uuid(), type: "p", text: bodyText });
          const medias = Array.isArray(d.media) ? (d.media as BlogMedia[]) : [];
          for (const m of medias) tmp.push({ id: uuid(), ...(m as any) });
          if (tmp.length === 0) tmp.push({ id: uuid(), type: "p", text: "" });
          setBlocks(tmp);
        }
      }
    })();
  }, [postId]);

  /* ===============================
     AI 多言語対応（タイトル＋本文 text / caption / 画像・動画 title）
  ================================ */
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [langQuery, setLangQuery] = useState("");
  const [translating, setTranslating] = useState(false);
  const inFlightRef = useRef(false);

  const filteredLangs = useMemo(() => {
    const q = langQuery.trim().toLowerCase();
    if (!q) return LANGS;
    return LANGS.filter(
      (l) =>
        l.label.toLowerCase().includes(q) || l.key.toLowerCase().includes(q)
    );
  }, [langQuery]);

  const canTranslate = useMemo(() => {
    const hasTitle = title.trim().length > 0;
    const hasTextBlocks =
      blocks.some(
        (b) =>
          typeof (b as any).text === "string" && String((b as any).text).trim()
      ) ||
      blocks.some(
        (b) =>
          typeof (b as any).caption === "string" &&
          String((b as any).caption).trim()
      ) ||
      // 画像・動画の「title」を翻訳対象に追加
      blocks.some(
        (b) =>
          (b.type === "image" || b.type === "video") &&
          typeof (b as any).title === "string" &&
          String((b as any).title).trim()
      );
    return hasTitle || hasTextBlocks;
  }, [title, blocks]);

  async function translateAndAppend(target: LangKey) {
    if (!canTranslate) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setTranslating(true);

    try {
      // 状態のスナップショット（並行更新の影響を避ける）
      const snapshotTitle = title;
      const snapshotBlocks = blocks;

      // 翻訳対象を 1 回のAPI呼び出しにまとめる
      // 先頭: 記事タイトル、その後: 各ブロックの text / caption / mediaTitle
      type Item =
        | { kind: "postTitle" }
        | { kind: "text"; idx: number }
        | { kind: "caption"; idx: number }
        | { kind: "mediaTitle"; idx: number }; // ← 追加（画像・動画の title）

      const items: Item[] = [];
      const strings: string[] = [];

      // 記事タイトル
      if (snapshotTitle.trim()) {
        items.push({ kind: "postTitle" });
        strings.push(snapshotTitle);
      }

      // 各ブロックの text / caption / mediaTitle（非空のみ）
      snapshotBlocks.forEach((b, idx) => {
        const t = (b as any).text;
        if (typeof t === "string" && t.trim()) {
          items.push({ kind: "text", idx });
          strings.push(t);
        }
        const c = (b as any).caption;
        if (typeof c === "string" && c.trim()) {
          items.push({ kind: "caption", idx });
          strings.push(c);
        }
        // 画像・動画タイトル
        if (
          (b.type === "image" || b.type === "video") &&
          typeof (b as any).title === "string" &&
          String((b as any).title).trim()
        ) {
          items.push({ kind: "mediaTitle", idx });
          strings.push(String((b as any).title));
        }
      });

      if (strings.length === 0) {
        setTranslating(false);
        inFlightRef.current = false;
        return;
      }

      const SEP = "\n---\n";
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", body: strings.join(SEP), target }),
      });
      if (!res.ok) throw new Error("翻訳APIエラー");
      const data = (await res.json()) as { body?: string };
      const parts = String(data.body ?? "").split(SEP);

      // 反映（重複追記ガードつき）
      let p = 0;

      // 記事タイトル
      if (items[0]?.kind === "postTitle") {
        const tTitle = (parts[p++] ?? "").trim();
        if (tTitle && !snapshotTitle.includes(tTitle)) {
          setTitle((prev) => (prev.trim() ? `${prev}\n${tTitle}` : tTitle));
        }
      }

      // 本文ブロック
      setBlocks((prev) => {
        const next = [...prev];
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.kind === "postTitle") continue; // もう処理済み
          const translated = (parts[p++] ?? "").trim();
          if (!translated) continue;

          const b = next[it.idx] as any;

          if (it.kind === "text") {
            const before = String(b.text ?? "");
            if (!before.includes(translated)) {
              b.text = before.trim() ? `${before}\n\n${translated}` : translated;
            }
          } else if (it.kind === "caption") {
            const before = String(b.caption ?? "");
            if (!before.includes(translated)) {
              b.caption = before.trim() ? `${before}\n${translated}` : translated;
            }
          } else if (it.kind === "mediaTitle") {
            const before = String(b.title ?? "");
            if (!before.includes(translated)) {
              // 画像・動画の title も改行で追記（見やすさ優先）
              b.title = before.trim() ? `${before}\n${translated}` : translated;
            }
          }

          next[it.idx] = { ...b };
        }
        return next;
      });

      // 成功したらモーダルを閉じる
      setShowLangPicker(false);
    } catch (e) {
      console.error(e);
      alert("翻訳に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setTranslating(false);
      inFlightRef.current = false;
    }
  }

  /* ===============================
     保存
  ================================ */
  const save = async () => {
    if (!title.trim()) {
      alert("タイトルを入力してください。");
      return;
    }
    setLoading(true);
    try {
      openSaveModal("準備中…", 5);

      if (postId) {
        // 更新
        const movedBlocks = await moveTempBlocksToPostIdWithProgress(
          postId,
          blocks,
          ({ pct, label }) =>
            updateSaveModal({ pct: Math.max(10, Math.min(90, pct)), label })
        );

        updateSaveModal({ label: "保存中…", pct: 95 });
        const plain = movedBlocks
          .filter((b) => b.type === "p")
          .map((b: any) => b.text || "")
          .join("\n\n")
          .trim();

        const refDoc = doc(db, "siteBlogs", SITE_KEY, "posts", postId);
        await updateDoc(refDoc, {
          title: title ?? "",
          body: plain,
          blocks: pruneUndefined(movedBlocks),
          updatedAt: serverTimestamp(),
        });

        updateSaveModal({ label: "完了", pct: 100 });
      } else {
        // 新規
        updateSaveModal({ label: "記事を作成中…", pct: 10 });
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

        const moved = await moveTempBlocksToPostIdWithProgress(
          created.id,
          blocks,
          ({ pct, label }) =>
            updateSaveModal({ pct: 10 + Math.round((pct / 100) * 80), label })
        );

        updateSaveModal({ label: "保存中…", pct: 95 });
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

        updateSaveModal({ label: "完了", pct: 100 });
      }

      setTimeout(() => {
        closeSaveModal();
        router.push("/blog");
      }, 400);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "保存に失敗しました。");
      closeSaveModal();
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     削除
  ================================ */
  const remove = async () => {
    if (!postId) return;
    if (!confirm("この記事を削除しますか？（メディアも削除されます）")) return;

    setLoading(true);
    openSaveModal("削除中…", 20);
    try {
      for (const b of blocks) {
        if ((b.type === "image" || b.type === "video") && (b as any).path) {
          try {
            await deleteObject(ref(storage, (b as any).path));
          } catch {}
        }
      }
      const refDoc = doc(db, "siteBlogs", SITE_KEY, "posts", postId);
      await deleteDoc(refDoc);
      updateSaveModal({ label: "完了", pct: 100 });

      setTimeout(() => {
        closeSaveModal();
        router.push("/blog");
      }, 300);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "削除に失敗しました。");
      closeSaveModal();
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     UI
  ================================ */
  return (
    <div
      className={`space-y-6 ${textColorClass} bg-white/20 rounded-2xl shadow`}
    >
      {/* タイトル */}
      <div className="p-5">
        <div className="grid gap-2">
          <label className="text-sm font-medium">タイトル</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル"
            className={textColorClass}
          />
        </div>

        {/* 操作列 */}
        <div className="flex items-center gap-2 mt-5 mb-5">
          <Button onClick={save} disabled={loading}>
            {postId ? "更新" : "公開"}
          </Button>
          {postId && (
            <Button variant="destructive" onClick={remove} disabled={loading}>
              削除
            </Button>
          )}
          {/* 🔤 AIで多言語対応 */}
          <Button
            variant="secondary"
            onClick={() => setShowLangPicker(true)}
            disabled={!canTranslate || translating || loading}
          >
            AIで多言語対応
          </Button>
        </div>

        {/* 本文（ブロック） */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">本文（ブロック）</label>
          <BlockEditor
            value={blocks}
            onChange={setBlocks}
            postIdForPath={postId ?? null}
          />
        </div>

        {/* 保存・削除 進捗モーダル */}
        {saveModal.open && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50">
            <div
              className={clsx(
                "w-[92%] max-w-md rounded-2xl p-5 shadow-xl",
                isDark ? "bg-gray-900 text-white" : "bg-white text-black"
              )}
            >
              <div className="mb-2 text-base font-semibold">
                {saveModal.label}
              </div>
              {saveModal.sub && (
                <div
                  className={clsx(
                    "mb-2 text-xs",
                    isDark ? "text-white/70" : "text-muted-foreground"
                  )}
                >
                  {saveModal.sub}
                </div>
              )}
              <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, saveModal.pct))}%`,
                  }}
                />
              </div>
              <div
                className={clsx(
                  "text-right text-xs tabular-nums",
                  isDark ? "text-white/70" : "text-muted-foreground"
                )}
              >
                {Math.max(0, Math.min(100, saveModal.pct))}%
              </div>
              <div className="mt-3 text-xs opacity-70">
                画面を閉じずにお待ちください…
              </div>
            </div>
          </div>
        )}

        {/* 🔤 言語ピッカーモーダル */}
        {showLangPicker && (
          <div
            className="fixed inset-0 z-[1201] flex items-center justify-center backdrop-blur-sm bg-black/40"
            onClick={() => !translating && setShowLangPicker(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={clsx(
                "w-full max-w-lg mx-4 rounded-2xl shadow-2xl border",
                isDark
                  ? "bg-gray-900/95 text-white border-white/10"
                  : "bg-white/95 text-black border-black/10"
              )}
            >
              <div className="p-5 border-b border-black/10 flex items-center justify-between">
                <h3 className="text-lg font-bold">言語を選択</h3>
                <button
                  type="button"
                  onClick={() => setShowLangPicker(false)}
                  className="text-sm opacity-70 hover:opacity-100"
                  disabled={translating}
                >
                  閉じる
                </button>
              </div>

              <div className="px-5 pt-4">
                <input
                  type="text"
                  value={langQuery}
                  onChange={(e) => setLangQuery(e.target.value)}
                  placeholder="言語名やコード（例: フランス語 / fr）"
                  className={clsx(
                    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
                    isDark ? "bg-black/40 border-white/20" : "bg-white"
                  )}
                />
              </div>

              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredLangs.map((lng) => (
                  <button
                    key={lng.key}
                    type="button"
                    onClick={() => translateAndAppend(lng.key)}
                    disabled={translating}
                    className={clsx(
                      "group relative rounded-xl border p-3 text-left transition",
                      isDark
                        ? "bg-black/30 border-white/10 hover:shadow-lg hover:-translate-y-0.5"
                        : "bg-white border-black/10 hover:shadow-lg hover:-translate-y-0.5",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500",
                      "disabled:opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{lng.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {lng.label}
                        </div>
                        <div className="text-xs opacity-70">/{lng.key}</div>
                      </div>
                    </div>
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-400 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
                {filteredLangs.length === 0 && (
                  <div className="col-span-full text-center text-sm opacity-70 py-6">
                    一致する言語が見つかりません
                  </div>
                )}
              </div>

              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={() => setShowLangPicker(false)}
                  className={clsx(
                    "w-full rounded-lg px-4 py-2",
                    isDark
                      ? "bg-white/10 hover:bg-white/20"
                      : "bg-gray-100 hover:bg-gray-200"
                  )}
                  disabled={translating}
                >
                  キャンセル
                </button>
              </div>

              {translating && (
                <div className="h-1 w-full overflow-hidden rounded-b-2xl">
                  <div className="h-full w-1/2 animate-[progress_1.2s_ease-in-out_infinite] bg-indigo-500" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
