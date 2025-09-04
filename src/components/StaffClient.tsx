"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { v4 as uuid } from "uuid";
import imageCompression from "browser-image-compression";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  CollectionReference,
  DocumentData,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useThemeGradient } from "@/lib/useThemeGradient";
import clsx from "clsx";
import { ThemeKey, THEMES } from "@/lib/themes";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableItem from "./SortableItem";
import { motion, useInView } from "framer-motion";

import { type Product } from "@/types/Product";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

/* ====== 設定 ====== */
type MediaType = "image" | "video";
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-m4v",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/mpeg",
  "video/3gpp",
  "video/3gpp2",
];
const MAX_VIDEO_SEC = 30;

/* ✅ 言語リスト（コンポーネント外で安定化） */
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
type LangKey = typeof LANGS[number]["key"];

export default function StaffClient() {
  const [list, setList] = useState<Product[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const uploading = progress !== null;

  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState(false);
  const [keywords, setKeywords] = useState(["", "", ""]);
  const [showKeywordInput, setShowKeywordInput] = useState(false);

  /* ▼ 多言語モーダル用 */
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [langQuery, setLangQuery] = useState("");
  const filteredLangs = useMemo(() => {
    const q = langQuery.trim().toLowerCase();
    if (!q) return LANGS;
    return LANGS.filter(
      (l) =>
        l.label.toLowerCase().includes(q) || l.key.toLowerCase().includes(q)
    );
  }, [langQuery]);

  const gradient = useThemeGradient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const isDark = useMemo(() => {
    const darkThemes: ThemeKey[] = ["brandG", "brandH", "brandI"];
    if (!gradient) return false;
    return darkThemes.some((key) => gradient === THEMES[key]);
  }, [gradient]);

  const colRef: CollectionReference = useMemo(
    () => collection(db, "siteStaffs", SITE_KEY, "items"),
    []
  );

  const jaCollator = useMemo(
    () => new Intl.Collator("ja-JP", { numeric: true, sensitivity: "base" }),
    []
  );

  useEffect(() => onAuthStateChanged(auth, (u) => setIsAdmin(!!u)), []);

  useEffect(() => {
    const unsub = onSnapshot(colRef, (snap) => {
      const rows: Product[] = snap.docs.map((d) => {
        const data = d.data() as DocumentData;
        return {
          id: d.id,
          title: data.title,
          body: data.body,
          price: data.price ?? 0,
          mediaURL: data.mediaURL ?? data.imageURL ?? "",
          mediaType: (data.mediaType ?? "image") as MediaType,
          originalFileName: data.originalFileName,
          taxIncluded: data.taxIncluded ?? true,
          order: data.order ?? 9999,
        };
      });
      rows.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      setList(rows);
    });
    return () => unsub();
  }, [colRef, jaCollator]);

  const saveProduct = async () => {
    if (uploading) return;
    if (!title.trim()) return alert("タイトル必須");
    if (formMode === "add" && !file) return alert("メディアを選択してください");

    try {
      const id = editing?.id ?? uuid();
      let mediaURL = editing?.mediaURL ?? "";
      let mediaType: MediaType = editing?.mediaType ?? "image";

      if (file) {
        const isImage = IMAGE_MIME_TYPES.includes(file.type);
        const isVideo = VIDEO_MIME_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
          alert(
            "対応形式：画像（JPEG, PNG, WEBP, GIF）／動画（MP4, MOV など）"
          );
          return;
        }

        mediaType = isVideo ? "video" : "image";

        const ext = (() => {
          if (isVideo) {
            switch (file.type) {
              case "video/quicktime":
                return "mov";
              case "video/webm":
                return "webm";
              case "video/ogg":
                return "ogv";
              case "video/x-m4v":
                return "m4v";
              case "video/x-msvideo":
                return "avi";
              case "video/x-ms-wmv":
                return "wmv";
              case "video/mpeg":
                return "mpg";
              case "video/3gpp":
                return "3gp";
              case "video/3gpp2":
                return "3g2";
              default:
                return "mp4";
            }
          }
          return "jpg"; // 画像はJPEG圧縮で保存
        })();

        const uploadFile = isVideo
          ? file
          : await imageCompression(file, {
              maxWidthOrHeight: 1200,
              maxSizeMB: 0.7,
              useWebWorker: true,
              fileType: "image/jpeg",
              initialQuality: 0.8,
            });

        const storageRef = ref(
          getStorage(),
          `products/public/${SITE_KEY}/${id}.${ext}`
        );
        const task = uploadBytesResumable(storageRef, uploadFile, {
          contentType: isVideo ? file.type : "image/jpeg",
        });

        setProgress(0);
        task.on("state_changed", (s) =>
          setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100))
        );
        await task;

        const downloadURL = await getDownloadURL(storageRef);
        if (!downloadURL) throw new Error("画像URLの取得に失敗しました");

        mediaURL = `${downloadURL}?v=${uuid()}`;
        setProgress(null);

        if (formMode === "edit" && editing) {
          const oldExt = editing.mediaType === "video" ? "mp4" : "jpg";
          if (oldExt !== ext) {
            await deleteObject(
              ref(getStorage(), `products/public/${SITE_KEY}/${id}.${oldExt}`)
            ).catch(() => {});
          }
        }
      }

      type ProductPayload = {
        title: string;
        body: string;
        mediaURL: string;
        mediaType: "image" | "video";
        originalFileName?: string;
      };

      const payload: ProductPayload = { title, body, mediaURL, mediaType };

      const originalFileName = file?.name || editing?.originalFileName;
      if (originalFileName) payload.originalFileName = originalFileName;

      if (formMode === "edit" && editing) {
        await updateDoc(doc(colRef, id), payload);
      } else {
        await addDoc(colRef, { ...payload, createdAt: serverTimestamp() });
      }

      closeForm();
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました。対応形式や容量をご確認ください。");
      setProgress(null);
    }
  };

  const remove = async (p: Product) => {
    if (uploading) return;
    if (!confirm(`「${p.title}」を削除しますか？`)) return;

    await deleteDoc(doc(colRef, p.id));
    if (p.mediaURL) {
      const ext = p.mediaType === "video" ? "mp4" : "jpg";
      await deleteObject(
        ref(getStorage(), `products/public/${SITE_KEY}/${p.id}.${ext}`)
      ).catch(() => {});
    }
  };

  const openAdd = () => {
    if (uploading) return;
    resetFields();
    setFormMode("add");
  };

  const openEdit = (p: Product) => {
    if (uploading) return;
    setEditing(p);
    setTitle(p.title);
    setBody(p.body);
    setFile(null);
    setFormMode("edit");
  };

  const closeForm = () => {
    if (uploading) return;
    setTimeout(() => {
      resetFields();
      setFormMode(null);
    }, 100);
  };

  const resetFields = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setFile(null);
    setKeywords(["", "", ""]);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = list.findIndex((item) => item.id === active.id);
    const newIndex = list.findIndex((item) => item.id === over.id);
    const newList = arrayMove(list, oldIndex, newIndex);
    setList(newList);

    const batch = writeBatch(db);
    newList.forEach((item, index) => {
      batch.update(doc(colRef, item.id), { order: index });
    });
    await batch.commit();
  };

  const generateBodyWithAI = async () => {
    const validKeywords = keywords.filter((k) => k.trim() !== "");
    if (!title || validKeywords.length < 1) {
      alert("名前とキーワードを1つ以上入力してください");
      return;
    }

    try {
      setAiLoading(true);
      const res = await fetch("/api/generate-intro-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: title, keywords: validKeywords }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成に失敗");

      setBody(data.text);
      setKeywords(["", "", ""]);
    } catch (err) {
      alert("紹介文の生成に失敗しました");
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  /* ▼ 翻訳→追記（タイトルは改行で追加、本文は見出しなしでそのまま追記） */
  const translateAndAppend = async (targetKey: LangKey) => {
    if (!title.trim() || !body.trim()) return;
    try {
      setTranslating(true);
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, target: targetKey }),
      });
      if (!res.ok) throw new Error("翻訳APIエラー");
      const data = (await res.json()) as { title?: string; body?: string };

      const tTitle = (data.title ?? "").trim();
      const tBody = (data.body ?? "").trim();

      // タイトル：改行で追記
      if (tTitle) setTitle((prev) => (prev ? `${prev}\n${tTitle}` : tTitle));

      // 本文：ヘッダー無しでそのまま追記
      if (tBody) setBody((prev) => (prev ? `${prev}\n\n${tBody}` : tBody));

      setShowLangPicker(false);
    } catch (e) {
      console.error(e);
      alert("翻訳に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setTranslating(false);
    }
  };

  if (!gradient) return null;

  return (
    <main className="max-w-5xl mx-auto p-4 pt-20">
      {uploading && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/60 gap-4">
          <p className="text-white">アップロード中… {progress}%</p>
          <div className="w-64 h-2 bg-gray-700 rounded">
            <div
              className="h-full bg-green-500 rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={list.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 lg:grid-cols-1 items-stretch w-full max-w-2xl mx-auto">
            {list.map((p) => (
              <SortableItem key={p.id} product={p}>
                {({ listeners, attributes, isDragging }) => (
                  <StaffCard
                    product={p}
                    isAdmin={isAdmin}
                    isDragging={isDragging}
                    isLoaded={loadedIds.has(p.id)}
                    isDark={isDark}
                    gradient={gradient}
                    listeners={listeners}
                    attributes={attributes}
                    onEdit={openEdit}
                    onRemove={remove}
                    onMediaLoad={() =>
                      setLoadedIds((prev) => new Set(prev).add(p.id))
                    }
                    uploading={uploading}
                  />
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isAdmin && formMode === null && (
        <button
          onClick={openAdd}
          aria-label="新規追加"
          disabled={uploading}
          className="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-pink-700 active:scale-95 transition disabled:opacity-50 cursor-pointer"
        >
          <Plus size={28} />
        </button>
      )}

      {isAdmin && formMode && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-center">
              {formMode === "edit"
                ? "スタッフプロフィールを編集"
                : "スタッフプロフィール追加"}
            </h2>

            {/* タイトルは改行可能 */}
            <textarea
              placeholder="名前（改行で多言語タイトルを追記できます）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              rows={2}
              disabled={uploading}
            />

            <textarea
              placeholder="紹介文"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              rows={4}
              disabled={uploading}
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowKeywordInput(!showKeywordInput)}
                className="px-3 py-1 bg-purple-600 text-white rounded flex items-center justify-center gap-1"
              >
                AIで紹介文を作成
              </button>
              {showKeywordInput && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="キーワード①"
                    className="w-full border px-3 py-2 rounded"
                    value={keywords[0]}
                    onChange={(e) =>
                      setKeywords([e.target.value, keywords[1], keywords[2]])
                    }
                  />
                  <input
                    type="text"
                    placeholder="キーワード②"
                    className="w-full border px-3 py-2 rounded"
                    value={keywords[1]}
                    onChange={(e) =>
                      setKeywords([keywords[0], e.target.value, keywords[2]])
                    }
                  />
                  <input
                    type="text"
                    placeholder="キーワード③"
                    className="w-full border px-3 py-2 rounded"
                    value={keywords[2]}
                    onChange={(e) =>
                      setKeywords([keywords[0], keywords[1], e.target.value])
                    }
                  />
                  <button
                    onClick={generateBodyWithAI}
                    className="w-full py-2 bg-blue-600 text-white rounded disabled:opacity-50 flex items-center justify-center gap-2"
                    disabled={aiLoading}
                  >
                    {aiLoading ? <>生成中...</> : "紹介文を生成する"}
                  </button>
                </div>
              )}
            </div>

            {/* ▼ AIで多国語対応 */}
            {title.trim() && body.trim() && (
              <button
                type="button"
                onClick={() => setShowLangPicker(true)}
                className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
                disabled={uploading || translating}
              >
                AIで多国語対応
              </button>
            )}

            {/* ▼ 言語ピッカー（ガラス風＋検索＋グリッド） */}
            {showLangPicker && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
                onClick={() => !translating && setShowLangPicker(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rounded-2xl bg-white/90 backdrop-saturate-150 border border-white/50">
                    <div className="p-5 border-b border-black/5 flex items-center justify-between">
                      <h3 className="text-lg font-bold">言語を選択</h3>
                      <button
                        type="button"
                        onClick={() => setShowLangPicker(false)}
                        className="text-sm text-gray-500 hover:text-gray-800"
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
                        placeholder="言語名やコードで検索（例: フランス語 / fr）"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            "bg-white hover:shadow-lg hover:-translate-y-0.5",
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
                              <div className="text-xs text-gray-500">
                                /{lng.key}
                              </div>
                            </div>
                          </div>
                          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-400 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      ))}
                      {filteredLangs.length === 0 && (
                        <div className="col-span-full text-center text-sm text-gray-500 py-6">
                          一致する言語が見つかりません
                        </div>
                      )}
                    </div>

                    <div className="px-5 pb-5">
                      <button
                        type="button"
                        onClick={() => setShowLangPicker(false)}
                        className="w-full rounded-lg px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
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
                </motion.div>
              </div>
            )}

            <label>画像 / 動画 ({MAX_VIDEO_SEC}秒以内)</label>
            <input
              type="file"
              accept={[...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES].join(",")}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;

                const isVideo = f.type.startsWith("video/");
                if (!isVideo) {
                  setFile(f);
                  return;
                }

                const blobURL = URL.createObjectURL(f);
                const vid = document.createElement("video");
                vid.preload = "metadata";
                vid.src = blobURL;

                vid.onloadedmetadata = () => {
                  URL.revokeObjectURL(blobURL);
                  if (vid.duration > MAX_VIDEO_SEC) {
                    alert(`動画は ${MAX_VIDEO_SEC} 秒以内にしてください`);
                    (e.target as HTMLInputElement).value = ""; // リセット
                    return;
                  }
                  setFile(f);
                };
              }}
              className="bg-gray-500 text-white w-full h-10 px-3 py-1 rounded"
              disabled={uploading}
            />
            {formMode === "edit" && editing?.originalFileName && (
              <p className="text-sm text-gray-600">
                現在のファイル: {editing.originalFileName}
              </p>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={saveProduct}
                disabled={uploading}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {formMode === "edit" ? "更新" : "追加"}
              </button>
              <button
                onClick={closeForm}
                disabled={uploading}
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

/* ====== カード ====== */
interface StoreCardProps {
  product: Product;
  isAdmin: boolean;
  isDragging: boolean;
  isLoaded: boolean;
  isDark: boolean;
  gradient: string;
  listeners: any;
  attributes: any;
  onEdit: (p: Product) => void;
  onRemove: (p: Product) => void;
  onMediaLoad: () => void;
  uploading: boolean;
}

export function StaffCard({
  product: p,
  isAdmin,
  isDragging,
  isLoaded,
  isDark,
  gradient,
  listeners,
  attributes,
  onEdit,
  onRemove,
  onMediaLoad,
  uploading,
}: StoreCardProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -150px 0px" });

  return (
    <motion.div
      ref={ref}
      layout={isDragging ? false : true}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={
        isDragging ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }
      }
      style={isDragging ? { transform: undefined } : undefined}
      className={clsx(
        "flex flex-col h-full border rounded-lg overflow-hidden shadow relative transition-colors duration-200",
        "bg-gradient-to-b",
        gradient,
        isDragging
          ? "z-50 shadow-xl"
          : isDark
          ? "bg-black/40 text-white"
          : "bg-white",
        "cursor-pointer",
        !isDragging && "hover:shadow-lg"
      )}
    >
      {auth.currentUser !== null && (
        <div
          {...attributes}
          {...listeners}
          onTouchStart={(e) => e.preventDefault()}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-10 h-10 bg-gray-200 text-gray-700 rounded-full text-sm flex items-center justify-center shadow">
            ≡
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(p);
            }}
            disabled={uploading}
            className="px-2 py-1 bg-blue-600 text-white text-md rounded shadow disabled:opacity-50"
          >
            編集
          </button>
          <button
            onClick={() => onRemove(p)}
            disabled={uploading}
            className="px-2 py-1 bg-red-600 text-white text-md rounded shadow disabled:opacity-50"
          >
            削除
          </button>
        </div>
      )}

      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <svg
            className="w-8 h-8 animate-spin text-pink-600"
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
        </div>
      )}

      {p.mediaType === "image" ? (
        <div className="relative w-full aspect-[1/1] sm:aspect-square">
          <Image
            src={p.mediaURL}
            alt={p.title}
            fill
            className="object-cover"
            sizes="(min-width:1024px) 320px, (min-width:640px) 45vw, 90vw"
            onLoad={onMediaLoad}
            unoptimized
          />
        </div>
      ) : (
        <div className="relative w-full aspect-[1/1] sm:aspect-square">
          <video
            src={p.mediaURL}
            muted
            playsInline
            autoPlay
            loop
            preload="auto"
            className="w-full h-full object-cover absolute top-0 left-0"
            onLoadedData={onMediaLoad}
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* タイトルは多言語改行に対応 */}
        <h2
          className={clsx(
            "text-sm font-bold whitespace-pre-wrap",
            isDark && "text-white"
          )}
        >
          {p.title}
        </h2>
        <p
          className={clsx(
            "text-sm whitespace-pre-wrap",
            isDark && "text-white"
          )}
        >
          {p.body}
        </p>
      </div>
    </motion.div>
  );
}

/* 任意：グローバルCSSに追加（翻訳中プログレスのアニメ） */
/* @keyframes progress { 0%{transform:translateX(-100%)} 50%{transform:translateX(0%)} 100%{transform:translateX(100%)} } */
