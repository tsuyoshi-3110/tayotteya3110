"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import { motion } from "framer-motion";
import imageCompression from "browser-image-compression";
import { v4 as uuid } from "uuid";

import { useThemeGradient } from "@/lib/useThemeGradient";
import { ThemeKey, THEMES } from "@/lib/themes";
import { type Product } from "@/types/Product";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";

import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { LANGS, type LangKey } from "@/lib/langs";
import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";

/* ---------- 型 ---------- */
type MediaType = "image" | "video";

type ProductDoc = Product & {
  base?: { title: string; body: string };
  t?: Array<{ lang: LangKey; title?: string; body?: string }>;
};

/* ---------- 多言語ユーティリティ ---------- */
function pickLocalized(
  p: ProductDoc,
  lang: UILang
): { title: string; body: string } {
  if (lang === "ja") {
    return {
      title: p.base?.title ?? p.title ?? "",
      body: p.base?.body ?? p.body ?? "",
    };
  }
  const hit = p.t?.find((x) => x.lang === lang);
  return {
    title: hit?.title ?? p.base?.title ?? p.title ?? "",
    body: hit?.body ?? p.base?.body ?? p.body ?? "",
  };
}

type Tr = { lang: LangKey; title: string; body: string };

async function translateAll(titleJa: string, bodyJa: string): Promise<Tr[]> {
  // 各言語ごとに「必ず Tr を返す」Promiseを作る（title/bodyは空文字で正規化）
  const jobs: Promise<Tr>[] = LANGS.map(async (l) => {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleJa, body: bodyJa, target: l.key }),
    });
    if (!res.ok) throw new Error(`translate error: ${l.key}`);

    const data = (await res.json()) as { title?: string; body?: string };
    return {
      lang: l.key,
      title: (data.title ?? "").trim(),
      body: (data.body ?? "").trim(),
    };
  });

  // 失敗は落とし、成功だけを取り出す
  const settled = await Promise.allSettled(jobs);
  return settled
    .filter((r): r is PromiseFulfilledResult<Tr> => r.status === "fulfilled")
    .map((r) => r.value);
}

/* ---------- 本体 ---------- */
export default function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();

  // 権限
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (u) => setIsAdmin(!!u)), []);

  // テーマ
  const gradient = useThemeGradient();
  const isDark = useMemo(() => {
    const darks: ThemeKey[] = ["brandG", "brandH", "brandI"];
    return !!gradient && darks.some((k) => gradient === THEMES[k]);
  }, [gradient]);

  // グローバル表示言語（ルートのピッカーで制御）
  const { uiLang } = useUILang();

  // Firestore の全文（base/t を含む）
  const [docData, setDocData] = useState<ProductDoc>({ ...product });

  // 編集モード（原文のみ）
  const [showEdit, setShowEdit] = useState(false);
  const [titleJa, setTitleJa] = useState(product.title ?? "");
  const [bodyJa, setBodyJa] = useState(product.body ?? "");

  // メディア
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null); // null で非表示
  const uploading = progress !== null;

  // “保存中”インジケーター
  const [saving, setSaving] = useState(false);

  // AI 本文生成
  const [showBodyGen, setShowBodyGen] = useState(false);
  const [aiKeywords, setAiKeywords] = useState<string[]>(["", "", ""]);
  const [aiGenLoading, setAiGenLoading] = useState(false);
  const canOpenBodyGen = Boolean(titleJa?.trim());
  const canGenerateBody = aiKeywords.some((k) => k.trim());

  // 初回：base/t を読み直し
  useEffect(() => {
    (async () => {
      const docRef = doc(db, "siteProducts", SITE_KEY, "items", product.id);
      const snap = await getDoc(docRef);
      const d = snap.data() as any;
      if (d) {
        const merged: ProductDoc = { ...product, ...(d as ProductDoc) };
        setDocData(merged);
        setTitleJa(merged.base?.title ?? merged.title ?? "");
        setBodyJa(merged.base?.body ?? merged.body ?? "");
      }
    })();
  }, [product.id, product]);

  // 表示テキスト（グローバル言語）
  const display = pickLocalized(docData, uiLang);

  // 本文AI生成
  const generateBodyWithAI = async () => {
    if (!titleJa.trim()) {
      alert("タイトル（原文）を入力してください");
      return;
    }
    try {
      setAiGenLoading(true);
      const keywords = aiKeywords.filter((k) => k.trim());
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleJa, keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "生成に失敗しました");
      const newBody = (data?.body ?? "").trim();
      if (!newBody) return alert("有効な本文が返りませんでした。");
      setBodyJa(newBody);
      setShowBodyGen(false);
      setAiKeywords(["", "", ""]);
    } catch {
      alert("本文生成に失敗しました");
    } finally {
      setAiGenLoading(false);
    }
  };

  // 保存：base に原文、t[] は全言語翻訳
  const handleSave = async () => {
    if (!titleJa.trim()) return alert("タイトル（原文）は必須です");
    setSaving(true);
    try {
      const docRef = doc(db, "siteProducts", SITE_KEY, "items", product.id);

      // メディアアップロード
      let mediaURL = docData.mediaURL;
      let mediaType: MediaType = (docData.mediaType as MediaType) ?? "image";

      if (file) {
        const isVideo = file.type.startsWith("video/");
        mediaType = isVideo ? "video" : "image";
        const isValidImage =
          file.type === "image/jpeg" || file.type === "image/png";
        const isValidVideo =
          file.type === "video/mp4" || file.type === "video/quicktime";
        if (!isValidImage && !isValidVideo)
          return alert("対応形式：JPEG/PNG/MP4/MOV");
        if (isVideo && file.size > 100 * 1024 * 1024)
          return alert("動画は 100 MB 未満にしてください");

        const ext = isVideo
          ? file.type === "video/quicktime"
            ? "mov"
            : "mp4"
          : "jpg";

        const uploadFile = isVideo
          ? file
          : await imageCompression(file, {
              maxWidthOrHeight: 1200,
              maxSizeMB: 0.7,
              useWebWorker: true,
              fileType: "image/jpeg",
              initialQuality: 0.8,
            });

        const sRef = storageRef(
          getStorage(),
          `products/public/${SITE_KEY}/${product.id}.${ext}`
        );
        const task = uploadBytesResumable(sRef, uploadFile, {
          contentType: isVideo ? file.type : "image/jpeg",
        });

        setProgress(0);
        await new Promise<void>((resolve, reject) => {
          task.on(
            "state_changed",
            (s) =>
              setProgress(
                Math.round((s.bytesTransferred / s.totalBytes) * 100)
              ),
            reject,
            resolve
          );
        });

        mediaURL = `${await getDownloadURL(sRef)}?v=${uuid()}`;
        setProgress(null);
      }

      // 全言語翻訳（保存中にまとめて）
      const t = await translateAll(titleJa.trim(), bodyJa.trim());

      // Firestore 更新
      const base = { title: titleJa.trim(), body: bodyJa.trim() };
      await updateDoc(docRef, {
        base,
        t,
        title: base.title, // 互換用
        body: base.body, // 互換用
        mediaURL,
        mediaType,
        updatedAt: serverTimestamp(),
      });

      // 画面反映
      setDocData((prev) => ({
        ...(prev as ProductDoc),
        base,
        t,
        title: base.title,
        body: base.body,
        mediaURL,
        mediaType,
      }));

      setShowEdit(false);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
      setProgress(null);
    } finally {
      setSaving(false);
    }
  };

  // 削除（ストレージ掃除付き）
  const handleDelete = async () => {
    if (!confirm(`「${docData.title}」を削除しますか？`)) return;
    const storage = getStorage();
    await deleteDoc(
      doc(db, "siteProducts", SITE_KEY, "items", product.id)
    ).catch(() => {});
    try {
      const folderRef = storageRef(storage, `products/public/${SITE_KEY}`);
      const listing = await listAll(folderRef);
      const mine = listing.items.filter((i) =>
        i.name.startsWith(`${product.id}.`)
      );
      await Promise.all(mine.map((item) => deleteObject(item).catch(() => {})));
    } catch {}
    // サブフォルダ（hls 等）掃除がある場合
    try {
      const walk = async (dirRef: ReturnType<typeof storageRef>) => {
        const ls = await listAll(dirRef);
        await Promise.all(ls.items.map((i) => deleteObject(i).catch(() => {})));
        await Promise.all(ls.prefixes.map((p) => walk(p)));
      };
      const hlsDirRef = storageRef(
        storage,
        `products/public/${SITE_KEY}/hls/${product.id}`
      );
      await walk(hlsDirRef);
    } catch {}
    router.back();
  };

  if (!gradient) return null;

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pt-24">
      {/* === 保存/アップロード インジケーター（全体ブロック） === */}
      {(saving || uploading) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white/90 rounded-xl shadow-2xl p-5 w-80 text-center">
            <p className="text-sm font-medium text-gray-800 mb-3">
              {uploading
                ? `アップロード中… ${progress}%`
                : "保存中…（翻訳を含む）"}
            </p>
            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded",
                  uploading ? "bg-green-500" : "bg-indigo-500 animate-pulse"
                )}
                style={{ width: uploading ? `${progress}%` : "60%" }}
              />
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={clsx(
          "border rounded-lg overflow-hidden shadow-xl relative transition-colors duration-200",
          "w-full max-w-md",
          "bg-gradient-to-b",
          "mt-5",
          gradient,
          isDark ? "bg-black/40 text-white" : "bg-white"
        )}
        aria-busy={saving || uploading}
      >
        {isAdmin && (
          <div className="absolute top-2 right-2 z-20 flex gap-1">
            <button
              onClick={() => setShowEdit(true)}
              className="px-2 py-1 bg-blue-600 text-white text-md rounded shadow disabled:opacity-50"
              disabled={saving || uploading}
            >
              編集
            </button>
            <button
              onClick={handleDelete}
              className="px-2 py-1 bg-red-600 text-white text-md rounded shadow disabled:opacity-50"
              disabled={saving || uploading}
            >
              削除
            </button>
          </div>
        )}

        {docData.mediaType === "image" ? (
          <div className="relative w-full aspect-square">
            <Image
              src={docData.mediaURL}
              alt={display.title || docData.title}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
          </div>
        ) : (
          <video
            src={docData.mediaURL}
            muted
            playsInline
            autoPlay
            loop
            preload="auto"
            className="w-full aspect-square object-cover"
          />
        )}

        <div className="p-4 space-y-2">
          <h1
            className={clsx(
              "text-lg font-bold whitespace-pre-wrap",
              isDark && "text-white"
            )}
          >
            {display.title}
          </h1>
          {display.body && (
            <p
              className={clsx(
                "text-sm whitespace-pre-wrap leading-relaxed",
                isDark && "text-white"
              )}
            >
              {display.body}
            </p>
          )}
        </div>
      </motion.div>

      {/* 編集モーダル（原文のみ） */}
      {isAdmin && showEdit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-center">
              商品を編集（原文）
            </h2>

            <input
              placeholder="タイトル（日本語・改行可）"
              value={titleJa}
              onChange={(e) => setTitleJa(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              disabled={uploading || saving}
            />

            <textarea
              placeholder="本文（日本語）"
              value={bodyJa}
              onChange={(e) => setBodyJa(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              rows={6}
              disabled={uploading || saving}
            />

            {/* AI 本文生成（任意） */}
            <button
              type="button"
              onClick={() => setShowBodyGen(true)}
              className={clsx(
                "w-full mt-2 px-4 py-2 rounded text-white",
                canOpenBodyGen
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-gray-400 cursor-not-allowed",
                (saving || uploading) && "opacity-50 cursor-not-allowed"
              )}
              disabled={!canOpenBodyGen || uploading || saving}
            >
              AIで本文生成
            </button>

            {/* 生成モーダル */}
            {showBodyGen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
                onClick={() => !aiGenLoading && setShowBodyGen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="w-full max-w-md mx-4 rounded-2xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rounded-2xl bg-white/90 backdrop-saturate-150 border border-white/50">
                    <div className="p-5 border-b border-black/5">
                      <h3 className="text-lg font-bold">AIで本文生成</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        キーワードを1〜3個入力（1つ以上で生成可能）
                      </p>
                    </div>
                    <div className="p-5 space-y-2">
                      {aiKeywords.map((k, i) => (
                        <input
                          key={i}
                          type="text"
                          value={k}
                          onChange={(e) => {
                            const next = [...aiKeywords];
                            next[i] = e.target.value;
                            setAiKeywords(next);
                          }}
                          placeholder={`キーワード${i + 1}`}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          disabled={saving}
                        />
                      ))}
                    </div>
                    <div className="px-5 pb-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBodyGen(false)}
                        className="flex-1 rounded-lg px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
                        disabled={aiGenLoading || saving}
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={generateBodyWithAI}
                        className={clsx(
                          "flex-1 rounded-lg px-4 py-2 text-white",
                          canGenerateBody
                            ? "bg-indigo-600 hover:bg-indigo-700"
                            : "bg-gray-400 cursor-not-allowed"
                        )}
                        disabled={!canGenerateBody || aiGenLoading || saving}
                      >
                        {aiGenLoading ? "生成中…" : "生成する"}
                      </button>
                    </div>
                    {aiGenLoading && (
                      <div className="h-1 w-full overflow-hidden rounded-b-2xl">
                        <div className="h-full w-1/2 animate-[progress_1.2s_ease-in-out_infinite] bg-indigo-500" />
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {/* メディア */}
            <input
              type="file"
              accept="image/*,video/mp4,video/quicktime"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="bg-gray-500 text-white w-full h-10 px-3 py-1 rounded"
              disabled={uploading || saving}
            />

            <div className="flex gap-2 justify-center">
              <button
                onClick={handleSave}
                disabled={uploading || saving}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {saving ? "保存中…" : "更新"}
              </button>
              <button
                onClick={() => !uploading && !saving && setShowEdit(false)}
                disabled={uploading || saving}
                className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
