"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, Pin } from "lucide-react";
import { v4 as uuid } from "uuid";
import imageCompression from "browser-image-compression";

import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  writeBatch,
  orderBy,
  query,
  serverTimestamp,
  CollectionReference,
  DocumentData,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import { useThemeGradient } from "@/lib/useThemeGradient";
import { ThemeKey, THEMES } from "@/lib/themes";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

import { LANGS, type LangKey } from "@/lib/langs";
import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";

/* ===================== 型 ===================== */
type MediaType = "image" | "video";

type Base = { title: string; body: string };
type Tr = { lang: LangKey; title?: string; body?: string };

type ProductDoc = {
  id: string;
  base: Base; // 原文（日本語）
  t: Tr[]; // 全言語翻訳
  title?: string; // 互換（原文コピー）
  body?: string; // 互換（原文コピー）
  mediaURL: string;
  mediaType: MediaType;
  price: number; // 外部型互換のため必須（無ければ 0）
  order?: number;
  originalFileName?: string;
  createdAt?: any;
  updatedAt?: any;
};

/* ===================== 定数 ===================== */
const COL_PATH = `siteProducts/${SITE_KEY}/items`;
const MAX_VIDEO_SEC = 60;

const VIDEO_MIME_TYPES: string[] = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/ogg",
  "video/x-m4v",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/mpeg",
  "video/3gpp",
  "video/3gpp2",
];
const IMAGE_MIME_TYPES: string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/* ===================== ユーティリティ ===================== */
function displayOf(p: ProductDoc, lang: UILang): Base {
  if (lang === "ja") return p.base;
  const hit = p.t?.find((x) => x.lang === lang);
  return {
    title: (hit?.title ?? p.base.title) || "",
    body: (hit?.body ?? p.base.body) || "",
  };
}

// 保存時：全言語を一括翻訳
async function translateAll(titleJa: string, bodyJa: string): Promise<Tr[]> {
  const tasks = LANGS.map(async (l) => {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleJa, body: bodyJa, target: l.key }),
    });
    if (!res.ok) throw new Error(`translate failed: ${l.key}`);
    const data = (await res.json()) as { title?: string; body?: string };
    return {
      lang: l.key,
      title: (data.title ?? "").trim(),
      body: (data.body ?? "").trim(),
    };
  });
  return Promise.all(tasks);
}

/* ===================== DnD Item ===================== */
function SortableItem({
  product,
  children,
}: {
  product: ProductDoc;
  children: (args: {
    attributes: any;
    listeners: any;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

/* ===================== 本体 ===================== */
export default function ProductsClient() {
  const router = useRouter();
  const [list, setList] = useState<ProductDoc[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // グローバル表示言語（ルートのピッカーで制御）
  const { uiLang } = useUILang();

  // フォーム
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<ProductDoc | null>(null);

  // 原文（日本語）の編集フィールド
  const [titleJa, setTitleJa] = useState("");
  const [bodyJa, setBodyJa] = useState("");
  const [price, setPrice] = useState<number>(0);

  // メディア
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null); // null で非表示

  // 保存インジケータ
  const [saving, setSaving] = useState(false);

  const gradient = useThemeGradient();
  const isDark = useMemo(() => {
    const darks: ThemeKey[] = ["brandG", "brandH", "brandI"];
    return !!gradient && darks.some((k) => gradient === THEMES[k]);
  }, [gradient]);

  const colRef: CollectionReference<DocumentData> = useMemo(
    () => collection(db, COL_PATH),
    []
  );

  /* 権限 */
  useEffect(() => onAuthStateChanged(auth, (u) => setIsAdmin(!!u)), []);

  /* 購読（order昇順） */
  useEffect(() => {
    const q = query(colRef, orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows: ProductDoc[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const base: Base = data.base ?? {
          title: data.title ?? "",
          body: data.body ?? "",
        };
        const t: Tr[] = Array.isArray(data.t) ? data.t : [];
        return {
          id: d.id,
          base,
          t,
          title: data.title,
          body: data.body,
          mediaURL: data.mediaURL ?? "",
          mediaType: (data.mediaType as MediaType) ?? "image",
          price: typeof data.price === "number" ? data.price : 0,
          order: data.order ?? 9999,
          originalFileName: data.originalFileName,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      rows.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      setList(rows);
    });
    return () => unsub();
  }, [colRef]);

  /* 並べ替え */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = list.findIndex((x) => x.id === active.id);
      const newIndex = list.findIndex((x) => x.id === over.id);
      const next = arrayMove(list, oldIndex, newIndex);
      setList(next);

      const batch = writeBatch(db);
      next.forEach((p, i) => batch.update(doc(colRef, p.id), { order: i }));
      await batch.commit();
    },
    [list, colRef]
  );

  /* ファイル選択（動画は長さチェック） */
  const onSelectFile = (f: File) => {
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    if (!isVideo) {
      setFile(f);
      return;
    }
    const url = URL.createObjectURL(f);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (v.duration > MAX_VIDEO_SEC) {
        alert(`動画は ${MAX_VIDEO_SEC} 秒以内にしてください`);
        return;
      }
      setFile(f);
    };
  };

  /* フォーム開閉 */
  const openAdd = () => {
    if (saving || progress !== null) return;
    setEditing(null);
    setTitleJa("");
    setBodyJa("");
    setPrice(0);
    setFile(null);
    setFormMode("add");
  };

  const openEdit = (p: ProductDoc) => {
    if (saving || progress !== null) return;
    setEditing(p);
    setTitleJa(p.base.title);
    setBodyJa(p.base.body);
    setPrice(typeof p.price === "number" ? p.price : 0);
    setFile(null);
    setFormMode("edit");
  };

  const closeForm = useCallback(() => {
    if (saving || progress !== null) return;
    setFormMode(null);
    setEditing(null);
    setTitleJa("");
    setBodyJa("");
    setPrice(0);
    setFile(null);
  }, [saving, progress]);

  /* 保存（全言語生成 → Firestore） */
  const saveProduct = useCallback(async () => {
    if (progress !== null || saving) return;
    if (!titleJa.trim()) return alert("タイトル（原文）は必須です");
    if (formMode === "add" && !file) return alert("メディアを選択してください");

    setSaving(true);
    try {
      const id = editing?.id ?? uuid();
      let mediaURL = editing?.mediaURL ?? "";
      let mediaType: MediaType = editing?.mediaType ?? "image";
      let originalFileName = editing?.originalFileName;

      // メディアアップロード
      if (file) {
        const isVideo = file.type.startsWith("video/");
        mediaType = isVideo ? "video" : "image";

        const isValidVideo = VIDEO_MIME_TYPES.includes(file.type);
        const isValidImage = IMAGE_MIME_TYPES.includes(file.type);
        if (!isValidImage && !isValidVideo) {
          alert(
            "対応形式：画像（JPEG/PNG/WEBP/GIF）／動画（MP4/MOV/WebM など）"
          );
          setSaving(false);
          return;
        }

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

        const sref = storageRef(
          getStorage(),
          `products/public/${SITE_KEY}/${id}.${ext}`
        );
        const task = uploadBytesResumable(sref, uploadFile, {
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

        const downloadURL = await getDownloadURL(sref);
        mediaURL = `${downloadURL}?v=${uuid()}`;
        originalFileName = file.name;
        setProgress(null);

        // 旧拡張子を掃除（編集時）
        if (formMode === "edit" && editing) {
          const oldExt = editing.mediaType === "video" ? "mp4" : "jpg";
          if (oldExt !== ext) {
            await deleteObject(
              storageRef(
                getStorage(),
                `products/public/${SITE_KEY}/${id}.${oldExt}`
              )
            ).catch(() => {});
          }
        }
      }

      // 全言語翻訳
      const t = await translateAll(titleJa.trim(), bodyJa.trim());

      // ペイロード
      const base: Base = { title: titleJa.trim(), body: bodyJa.trim() };
      const payload: Partial<ProductDoc> & {
        base: Base;
        t: Tr[];
        title: string;
        body: string;
        mediaURL: string;
        mediaType: MediaType;
        price: number;
      } = {
        base,
        t,
        title: base.title, // 互換
        body: base.body, // 互換
        mediaURL,
        mediaType,
        price: Number.isFinite(price) ? Number(price) : 0,
        ...(originalFileName ? { originalFileName } : {}),
      };

      if (formMode === "edit" && editing) {
        await updateDoc(doc(colRef, id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        // 末尾に追加
        const tail = (list.at(-1)?.order ?? list.length - 1) + 1;
        await addDoc(colRef, {
          ...payload,
          createdAt: serverTimestamp(),
          order: tail,
        });
      }

      closeForm();
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました。対応形式や容量をご確認ください。");
      setProgress(null);
    } finally {
      setSaving(false);
    }
  }, [
    progress,
    saving,
    titleJa,
    bodyJa,
    price,
    formMode,
    file,
    editing,
    colRef,
    list,
    closeForm,
  ]);

  if (!gradient) return null;

  /* ===================== JSX ===================== */
  return (
    <main className="max-w-5xl mx-auto p-4 pt-20">
      {/* アップロード / 保存インジケータ */}
      {(progress !== null || saving) && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/60 gap-4">
          <p className="text-white">
            {saving ? "保存中…" : `アップロード中… ${progress}%`}
          </p>
          {!saving && (
            <div className="w-64 h-2 bg-gray-700 rounded">
              <div
                className="h-full bg-green-500 rounded transition-all"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 一覧 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={list.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-2 items-stretch mt-4">
            {list.map((p) => {
              const loc = displayOf(p, uiLang);
              return (
                <SortableItem key={p.id} product={p}>
                  {({ listeners, attributes, isDragging }) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => {
                        if (isDragging) return;
                        router.push(`/products/${p.id}`);
                      }}
                      className={clsx(
                        "flex flex-col h-full border rounded-lg shadow-xl relative overflow-visible transition-colors duration-200 cursor-pointer",
                        "bg-gradient-to-b",
                        gradient,
                        isDragging
                          ? "bg-yellow-100"
                          : isDark
                          ? "bg-black/40 text-white"
                          : "bg-white",
                        !isDragging && "hover:shadow-lg"
                      )}
                    >
                      {/* ドラッグハンドル（クリックは止める） */}
                      {auth.currentUser !== null && (
                        <div
                          {...attributes}
                          {...listeners}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-30 cursor-grab active:cursor-grabbing select-none"
                        >
                          <div className="w-10 h-10 rounded-full bg-white/95 border border-black/10 text-gray-700 text-sm flex items-center justify-center shadow-lg">
                            <Pin />
                          </div>
                        </div>
                      )}

                      {/* メディア */}
                      {p.mediaType === "image" ? (
                        <div className="relative w-full aspect-square">
                          <Image
                            src={p.mediaURL}
                            alt={loc.title}
                            fill
                            className="object-cover"
                            sizes="100vw"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <video
                          src={p.mediaURL}
                          muted
                          playsInline
                          autoPlay
                          loop
                          preload="auto"
                          className="w-full aspect-square object-cover"
                        />
                      )}

                      <div className="p-3 space-y-1">
                        <h2
                          className={clsx(
                            "text-sm font-bold whitespace-pre-wrap",
                            isDark && "text-white"
                          )}
                        >
                          {loc.title}
                        </h2>
                      </div>

                      {isAdmin && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(p);
                            }}
                            disabled={saving || progress !== null}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded shadow disabled:opacity-50"
                          >
                            編集
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* 追加 FAB */}
      {isAdmin && formMode === null && (
        <button
          onClick={openAdd}
          aria-label="新規追加"
          disabled={saving || progress !== null}
          className="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-pink-700 active:scale-95 transition disabled:opacity-50 cursor-pointer"
        >
          <Plus size={28} />
        </button>
      )}

      {/* フォーム（原文のみ編集） */}
      {isAdmin && formMode && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-center">
              {formMode === "edit" ? "編集（原文）" : "新規追加（原文）"}
            </h2>

            <input
              placeholder="タイトル（日本語・改行可）"
              value={titleJa}
              onChange={(e) => setTitleJa(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              disabled={saving || progress !== null}
            />

            <textarea
              placeholder="本文（日本語）"
              value={bodyJa}
              onChange={(e) => setBodyJa(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              rows={6}
              disabled={saving || progress !== null}
            />

            <div>
              <label className="text-sm font-medium">価格（円）</label>
              <input
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-1 w-full border px-3 py-2 rounded"
                disabled={saving || progress !== null}
              />
            </div>

            <label className="text-sm font-medium">
              画像 / 動画 (60秒以内)
            </label>
            <input
              type="file"
              accept={[...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES].join(",")}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onSelectFile(f);
              }}
              className="bg-gray-500 text-white w-full h-10 px-3 py-1 rounded"
              disabled={saving || progress !== null}
            />
            {formMode === "edit" && editing?.originalFileName && (
              <p className="text-sm text-gray-600">
                現在のファイル: {editing.originalFileName}
              </p>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={saveProduct}
                disabled={saving || progress !== null}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {saving
                  ? "保存中…"
                  : formMode === "edit"
                  ? "更新"
                  : "追加"}
              </button>
              <button
                onClick={closeForm}
                disabled={saving || progress !== null}
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
