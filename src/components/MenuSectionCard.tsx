"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import MenuItemCard from "./MenuItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  ref,
  UploadTask,
} from "firebase/storage";

import clsx from "clsx";
import { ThemeKey, THEMES } from "@/lib/themes";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import ProductMedia from "@/components/ProductMedia";

/* ===== 多言語候補 ===== */
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

/* ===== 型 ===== */
type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price?: number | null;
  isTaxIncluded?: boolean;
  order: number;
};
type Section = {
  id: string;
  title: string;
  order: number;
  siteKey: string;
  mediaType?: "image" | "video" | null;
  mediaUrl?: string | null;
  durationSec?: number | null;
  orientation?: "portrait" | "landscape" | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
};

export default function MenuSectionCard({
  section,
  onTitleUpdate,
  isLoggedIn,
  onDeleteSection,
}: {
  section: Section;
  onTitleUpdate: (newTitle: string) => void;
  isLoggedIn: boolean;
  onDeleteSection: () => void;
  onSectionPatch?: (patch: Partial<Section>) => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);

  // ▼▼ ここが統一モーダルの状態 ▼▼
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    target?: MenuItem | null;
  }>({ open: false, mode: "create", target: null });

  const [newTitle, setNewTitle] = useState(section.title);

  const gradient = useThemeGradient();
  const isDark = useMemo(() => {
    if (!gradient) return false;
    return (["brandG", "brandH", "brandI"] as ThemeKey[]).some(
      (k) => gradient === THEMES[k]
    );
  }, [gradient]);

  /* ===== セクション／アイテム取得 ===== */
  useEffect(
    () => setNewTitle(section.title || ""),
    [section.id, section.title]
  );

  useEffect(() => {
    (async () => {
      const qy = query(
        collection(db, `menuSections/${section.id}/items`),
        orderBy("order", "asc")
      );
      const snap = await getDocs(qy);
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MenuItem, "id">),
        }))
      );
    })();
  }, [section.id]);

  /* ===== セクション削除 ===== */
  const handleDeleteSection = async () => {
    if (!confirm("このセクションを削除しますか？")) return;
    try {
      if (section.mediaUrl) {
        const sref = ref(getStorage(), section.mediaUrl);
        await deleteObject(sref);
      }
    } catch {}
    await deleteDoc(doc(db, "menuSections", section.id));
    onDeleteSection();
  };

  /* ===== セクション名更新 ===== */
  const handleUpdateSectionTitle = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return alert("セクション名を入力してください");
    await updateDoc(doc(db, "menuSections", section.id), { title: trimmed });
    onTitleUpdate(trimmed);
    setShowEditSectionModal(false);
  };

  /* ===== メディア関連 ===== */
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  const pickMedia = () => fileInputRef.current?.click();

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0] ?? null;
    e.currentTarget.value = "";
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo)
      return alert("画像または動画を選択してください。");

    let durationSec: number | null = null;
    let mediaWidth: number | null = null;
    let mediaHeight: number | null = null;
    let orientation: "portrait" | "landscape" = "landscape";
    try {
      if (isVideo) {
        const meta = await getVideoMetaFromFile(file);
        if (meta.duration > 61)
          return alert(
            `動画は60秒以内にしてください。（約${Math.round(meta.duration)}秒）`
          );
        durationSec = Math.round(meta.duration);
        mediaWidth = meta.width;
        mediaHeight = meta.height;
        orientation = meta.height > meta.width ? "portrait" : "landscape";
      } else {
        const size = await getImageSize(file);
        mediaWidth = size.width;
        mediaHeight = size.height;
        orientation = size.height > size.width ? "portrait" : "landscape";
      }
    } catch {
      return alert("メディア情報の取得に失敗しました。");
    }

    try {
      setUploading(true);
      const ext = getExt(file.name) || (isImage ? "jpg" : "mp4");
      const path = `sections/${SITE_KEY}/${section.id}/header.${ext}`;
      const sref = storageRef(getStorage(), path);
      setUploadPercent(0);
      setUploadOpen(true);
      const task = uploadBytesResumable(sref, file, { contentType: file.type });
      uploadTaskRef.current = task;
      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) =>
            setUploadPercent((snap.bytesTransferred / snap.totalBytes) * 100),
          (err) => reject(err),
          () => resolve()
        );
      });
      const url = await getDownloadURL(task.snapshot.ref);
      const payload: Partial<Section> = {
        mediaType: isImage ? "image" : "video",
        mediaUrl: url,
        durationSec,
        orientation,
        mediaWidth,
        mediaHeight,
      };
      await updateDoc(doc(db, "menuSections", section.id), payload);
      Object.assign(section, payload);
      setShowEditSectionModal(false);
    } catch (err: any) {
      if (err?.code !== "storage/canceled")
        alert("アップロードに失敗しました。");
    } finally {
      setUploading(false);
      setUploadOpen(false);
      uploadTaskRef.current = null;
    }
  };

  const cancelUpload = () => {
    try {
      uploadTaskRef.current?.cancel();
    } finally {
      setUploadOpen(false);
      setUploading(false);
    }
  };

  function UploadProgressModal({
    open,
    percent,
    onCancel,
    title = "アップロード中…",
  }: {
    open: boolean;
    percent: number;
    onCancel: () => void;
    title?: string;
  }) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
        <div className="w-[90%] max-w-sm rounded-lg bg-white p-5 shadow-xl">
          <h2 className="mb-3 text-lg font-semibold">{title}</h2>
          <div className="mb-2 text-sm text-gray-600">
            {Math.floor(percent)}%
          </div>
          <div className="h-2 w-full rounded bg-gray-200">
            <div
              className="h-2 rounded bg-blue-500 transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded bg-red-500 px-3 py-1.5 text-white hover:bg-red-600"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  }

  const removeMedia = async () => {
    if (!section.mediaUrl) return;
    if (!confirm("添付メディアを削除しますか？")) return;
    try {
      try {
        const sref = ref(getStorage(), section.mediaUrl);
        await deleteObject(sref);
      } catch {}
      await updateDoc(doc(db, "menuSections", section.id), {
        mediaType: null,
        mediaUrl: null,
        durationSec: null,
        orientation: null,
        mediaWidth: null,
        mediaHeight: null,
      });
      section.mediaType = null;
      section.mediaUrl = null;
      section.durationSec = null;
      section.orientation = null;
      section.mediaWidth = null;
      section.mediaHeight = null;
      setNewTitle((t) => t);
      setShowEditSectionModal(false);
    } catch {
      alert("メディア削除に失敗しました。");
      setShowEditSectionModal(false);
    }
  };

  const mediaNode = useMemo(() => {
    if (!section.mediaUrl || !section.mediaType) return null;
    return (
      <ProductMedia
        src={section.mediaUrl}
        type={section.mediaType}
        className="mb-3 rounded-lg shadow-sm"
        alt={`${section.title} のメディア`}
      />
    );
  }, [section.mediaUrl, section.mediaType, section.title]);

  /* ===== 画面 ===== */
  return (
    <>
      <div className="bg-white/30 backdrop-blur-sm shadow-md p-4 rounded mb-6">
        {isLoggedIn && (
          <div className="flex gap-2 flex-wrap mt-6 mb-6">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEditSectionModal(true)}
            >
              ✎ セクション名/メディア
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSection}
            >
              セクション削除
            </Button>
          </div>
        )}

        <h2
          className={clsx(
            "text-xl font-semibold mb-4 whitespace-pre-wrap",
            isDark ? "text-white" : "text-gray-900"
          )}
        >
          {section.title}
        </h2>

        {mediaNode}

        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            isLoggedIn={isLoggedIn}
            onDelete={async () => {
              if (!confirm("このメニューを削除しますか？")) return;
              await deleteDoc(
                doc(db, `menuSections/${section.id}/items`, item.id)
              );
              setItems((prev) => prev.filter((it) => it.id !== item.id));
            }}
            onEdit={(it) =>
              setItemModal({ open: true, mode: "edit", target: it })
            }
          />
        ))}

        {isLoggedIn && (
          <Button
            size="sm"
            className="mt-2"
            onClick={() =>
              setItemModal({ open: true, mode: "create", target: null })
            }
          >
            ＋ メニュー追加
          </Button>
        )}
      </div>

      {/* セクション名編集＋メディア添付モーダル */}
      {showEditSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">セクションを編集</h2>
            <label className="text-sm font-medium">セクション名</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mb-4 mt-1"
            />
            <div className="mb-3">
              <div className="text-sm font-medium mb-1">メディア（任意）</div>
              {section.mediaUrl ? (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600">
                    現在: {section.mediaType === "image" ? "画像" : "動画"}
                    {section.durationSec
                      ? `（約${Math.round(section.durationSec)}秒）`
                      : ""}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={pickMedia}
                      disabled={uploading}
                    >
                      置き換え
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={removeMedia}
                      disabled={uploading}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pickMedia}
                  disabled={uploading}
                >
                  {uploading
                    ? "アップロード中…"
                    : "画像/動画を選択（動画は60秒まで）"}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={onPickFile}
              />
            </div>
            <div className="flex justify-between sticky bottom-0 bg-white pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditSectionModal(false)}
              >
                閉じる
              </Button>
              <Button onClick={handleUpdateSectionTitle} disabled={uploading}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ★★★ 追加/編集 兼用：統一モーダル ★★★ */}
      <ItemModal
        open={itemModal.open}
        mode={itemModal.mode}
        initial={
          itemModal.mode === "edit" && itemModal.target
            ? {
                id: itemModal.target.id,
                name: itemModal.target.name ?? "",
                description: itemModal.target.description ?? "",
                price:
                  itemModal.target.price == null
                    ? ""
                    : String(itemModal.target.price),
                isTaxIncluded: itemModal.target.isTaxIncluded ?? true,
                order: itemModal.target.order ?? items.length,
              }
            : {
                id: undefined,
                name: "",
                description: "",
                price: "",
                isTaxIncluded: true,
                order: items.length,
              }
        }
        onClose={() => setItemModal((s) => ({ ...s, open: false }))}
        onSaved={(saved) => {
          if (itemModal.mode === "create") {
            setItems((prev) => [...prev, saved]);
          } else {
            setItems((prev) =>
              prev.map((it) => (it.id === saved.id ? saved : it))
            );
          }
          setItemModal((s) => ({ ...s, open: false }));
        }}
        sectionId={section.id}
      />

      <UploadProgressModal
        open={uploadOpen}
        percent={uploadPercent}
        onCancel={cancelUpload}
        title="メディアをアップロード中…"
      />
    </>
  );
}

/* ========= ItemModal（追加/編集 兼用・AI多言語＋AI説明生成入り） ========= */
function ItemModal({
  open,
  mode,
  initial,
  onClose,
  onSaved,
  sectionId,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: {
    id?: string;
    name: string;
    description: string;
    price: string; // 空文字 or 数字文字列
    isTaxIncluded: boolean;
    order: number;
  };
  onClose: () => void;
  onSaved: (saved: {
    id: string;
    name: string;
    description?: string;
    price?: number | null;
    isTaxIncluded?: boolean;
    order: number;
  }) => void;
  sectionId: string;
}) {
  const [name, setName] = useState(initial.name);
  const [desc, setDesc] = useState(initial.description);
  const [price, setPrice] = useState(initial.price);
  const [isTaxIncluded, setIsTaxIncluded] = useState(initial.isTaxIncluded);

  // AI: 多言語
  const [trOpen, setTrOpen] = useState(false);
  const [trLangQuery, setTrLangQuery] = useState("");
  const [trLoading, setTrLoading] = useState(false);
  const [autoCollapse, setAutoCollapse] = useState(true);
  const baseTitleRef = useRef<string>("");
  const baseBodyRef = useRef<string>("");
  const inFlightRef = useRef(false);
  const doneLangsRef = useRef<Set<LangKey>>(new Set());
  const filteredLangs = useMemo(() => {
    const q = trLangQuery.trim().toLowerCase();
    if (!q) return LANGS;
    return LANGS.filter(
      (l) =>
        l.label.toLowerCase().includes(q) || l.key.toLowerCase().includes(q)
    );
  }, [trLangQuery]);

  // AI: 説明生成
  const [genOpen, setGenOpen] = useState(false);
  const [genKeywords, setGenKeywords] = useState<string[]>(["", "", ""]);
  const [genLoading, setGenLoading] = useState(false);

  const firstLine = (s: string) => (s || "").split("\n")[0]?.trim() ?? "";
  const firstPara = (s: string) => (s || "").split(/\n{2,}/)[0]?.trim() ?? "";

  // モーダル開くたびに初期値へ
  React.useEffect(() => {
    if (open) {
      setName(initial.name);
      setDesc(initial.description);
      setPrice(initial.price);
      setIsTaxIncluded(initial.isTaxIncluded);
      setTrOpen(false);
      setGenOpen(false);
      setTrLangQuery("");
      setGenKeywords(["", "", ""]);
      doneLangsRef.current = new Set();
      inFlightRef.current = false;
    }
  }, [open, initial]);

  const save = async () => {
    if (!name.trim()) return alert("名前は必須です");
    const priceNum =
      price.trim() === ""
        ? null
        : Number.isNaN(Number(price))
        ? null
        : Number(price);

    if (mode === "create") {
      const refDoc = await addDoc(
        collection(db, `menuSections/${sectionId}/items`),
        {
          name: name.trim(),
          description: desc.trim(),
          price: priceNum,
          isTaxIncluded,
          order: initial.order,
        }
      );
      onSaved({
        id: refDoc.id,
        name: name.trim(),
        description: desc.trim(),
        price: priceNum,
        isTaxIncluded,
        order: initial.order,
      });
    } else {
      if (!initial.id) return;
      await updateDoc(doc(db, `menuSections/${sectionId}/items`, initial.id), {
        name: name.trim(),
        description: desc.trim(),
        price: priceNum,
        isTaxIncluded,
      });
      onSaved({
        id: initial.id,
        name: name.trim(),
        description: desc.trim(),
        price: priceNum,
        isTaxIncluded,
        order: initial.order,
      });
    }
  };

  const canTranslate = Boolean(name.trim() || desc.trim());
  const canOpenGen = name.trim().length > 0;
  const canGenerate =
    canOpenGen && genKeywords.some((k) => (k || "").trim()) && !genLoading;

  const startTranslatePanel = () => {
    const next = !trOpen;
    setTrOpen(next);
    if (next) {
      baseTitleRef.current = firstLine(name);
      baseBodyRef.current = firstPara(desc);
      doneLangsRef.current = new Set();
    }
  };

  const doTranslate = async (target: LangKey) => {
    if (!canTranslate) return;
    if (inFlightRef.current) return;
    if (doneLangsRef.current.has(target)) return;
    inFlightRef.current = true;
    setTrLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: baseTitleRef.current,
          body: baseBodyRef.current || " ",
          target,
        }),
      });
      if (!res.ok) throw new Error("翻訳APIエラー");
      const data = (await res.json()) as { title?: string; body?: string };
      const tTitle = (data.title ?? "").trim();
      const tBody = (data.body ?? "").trim();
      if (tTitle) setName((prev) => (prev ? `${prev}\n${tTitle}` : tTitle));
      if (tBody) setDesc((prev) => (prev ? `${prev}\n\n${tBody}` : tBody));
      doneLangsRef.current.add(target);
      if (autoCollapse) setTrOpen(false);
    } catch {
      alert("翻訳に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setTrLoading(false);
      inFlightRef.current = false;
    }
  };

  const doGenerate = async () => {
    if (!canGenerate) return;
    setGenLoading(true);
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: name.trim(),
          keywords: genKeywords.map((k) => k.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.body)
        throw new Error(data?.error || "生成に失敗しました");
      const out = String(data.body).trim();
      setDesc((prev) => (prev?.trim() ? `${prev}\n\n${out}` : out));
      setGenKeywords(["", "", ""]);
      if (autoCollapse) setGenOpen(false);
    } catch {
      alert("説明文の生成に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setGenLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-lg shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4">
          {mode === "create" ? "メニューを追加" : "メニューを編集"}
        </h3>

        <Input
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-2"
        />
        <textarea
          placeholder="説明（任意）"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          className="w-full border px-3 py-2 rounded mb-3"
        />

        {/* AIアクション（同一モーダル内で開閉） */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            disabled={!canTranslate}
            onClick={startTranslatePanel}
            className={clsx(
              "flex-1 rounded px-4 py-2 text-white",
              canTranslate
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-indigo-400 cursor-not-allowed"
            )}
          >
            AIで多言語対応
          </button>

          <button
            type="button"
            disabled={!canOpenGen}
            onClick={() => setGenOpen((v) => !v)}
            className={clsx(
              "flex-1 rounded px-4 py-2 text-white",
              canOpenGen
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-purple-400 cursor-not-allowed"
            )}
          >
            AIで紹介文を作成
          </button>
        </div>

        {/* 成功後の自動クローズ */}
        <label className="flex items-center gap-2 text-xs text-gray-600 mb-3">
          <input
            type="checkbox"
            checked={autoCollapse}
            onChange={(e) => setAutoCollapse(e.target.checked)}
          />
          生成/翻訳が完了したらパネルを自動で閉じる
        </label>

        {/* ▼ 多言語パネル */}
        {trOpen && (
          <div className="rounded-lg border p-3 mb-3">
            <input
              type="text"
              value={trLangQuery}
              onChange={(e) => setTrLangQuery(e.target.value)}
              placeholder="言語名やコード（例: フランス語 / fr）"
              className="w-full border rounded px-3 py-2 text-sm mb-2"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredLangs.map((lng) => (
                <button
                  key={lng.key}
                  type="button"
                  disabled={trLoading}
                  onClick={() => doTranslate(lng.key)}
                  className="rounded border p-3 text-left bg-white hover:shadow"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{lng.emoji}</span>
                    <div className="text-sm">
                      <div className="font-semibold">{lng.label}</div>
                      <div className="text-gray-500 text-xs">/{lng.key}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {trLoading && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded bg-gray-200">
                <div className="h-full w-1/2 animate-[progress_1.2s_ease-in-out_infinite] bg-indigo-500" />
              </div>
            )}
          </div>
        )}

        {/* ▼ 紹介文生成パネル */}
        {genOpen && (
          <div className="rounded-lg border p-3 mb-3">
            <p className="text-sm text-gray-600 mb-2">
              タイトル：
              <span className="font-medium">{name || "（未入力）"}</span>
            </p>
            <p className="text-xs text-gray-500 mb-2">
              キーワードを1〜3個入力（1つ以上で生成可能）
            </p>
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="text"
                placeholder={`キーワード${i + 1}`}
                value={genKeywords[i] || ""}
                onChange={(e) => {
                  const next = [...genKeywords];
                  next[i] = e.target.value;
                  setGenKeywords(next);
                }}
                className="w-full border rounded px-3 py-2 text-sm mb-2"
                disabled={genLoading}
              />
            ))}
            <button
              type="button"
              onClick={doGenerate}
              disabled={!canGenerate}
              className={clsx(
                "w-full rounded px-4 py-2 text-white flex items-center justify-center gap-2",
                canGenerate
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-purple-400 cursor-not-allowed"
              )}
            >
              {genLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  生成中…
                </>
              ) : (
                "説明文を生成する"
              )}
            </button>
          </div>
        )}

        {/* 価格・税込/税別 */}
        <Input
          placeholder="価格（例：5500）(任意)"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mb-2"
        />
        <div className="flex gap-4 mb-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="tax"
              checked={isTaxIncluded}
              onChange={() => setIsTaxIncluded(true)}
            />
            税込
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="tax"
              checked={!isTaxIncluded}
              onChange={() => setIsTaxIncluded(false)}
            />
            税別
          </label>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={save}>{mode === "create" ? "追加" : "保存"}</Button>
        </div>
      </div>
    </div>
  );
}

/* ===== helpers ===== */
function getExt(name: string) {
  const m = name.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}
export function getVideoMetaFromFile(
  file: File
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.onloadedmetadata = () => {
      const meta = {
        duration: v.duration,
        width: v.videoWidth,
        height: v.videoHeight,
      };
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      v.load();
      resolve(meta);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("動画メタデータの取得に失敗しました"));
    };
  });
}
function getImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
