"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Pin, Plus } from "lucide-react";

import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentData,
  query as fsQuery,
  orderBy,
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
import clsx from "clsx";
import { motion, useInView } from "framer-motion";

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

import { Button } from "@/components/ui/button";
import CardSpinner from "./CardSpinner";
import { LANGS, type LangKey } from "@/lib/langs";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { useUILang } from "@/lib/atoms/uiLangAtom";

/* ===================== 型 ===================== */
type StoreBase = {
  /** 原文（日本語） */
  name: string;
  address: string;
  description: string;
};

/** 翻訳は必ず string に正規化（空文字含む） */
type StoreTr = {
  lang: LangKey;
  name: string;
  address: string;
  description: string;
};

type StoreDoc = {
  id: string;
  base: StoreBase;
  t: StoreTr[]; // 全言語の翻訳
  imageURL?: string;
  originalFileName?: string;
  order?: number;
  createdAt?: any;
  updatedAt?: any;
};

/* ===================== 定数 ===================== */
const STORE_COL = `siteStores/${SITE_KEY}/items`;
const STORAGE_DIR = `stores/public/${SITE_KEY}`;
const ALLOWED_IMG_EXT = ["jpg", "jpeg", "png", "webp"];
const ALLOWED_IMG_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/* ===================== ユーティリティ ===================== */
function getExtFromName(name?: string) {
  const m = (name ?? "").match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

/** 表示用：選択言語のテキスト（無ければ原文にフォールバック） */
function pickLocalized(s: StoreDoc, lang: ReturnType<typeof useUILang>["uiLang"]): StoreBase {
  if (lang === "ja") return s.base;
  const tr = s.t?.find((x) => x.lang === lang);
  return {
    name: (tr?.name ?? s.base.name) || "",
    address: (tr?.address ?? s.base.address) || "",
    description: (tr?.description ?? s.base.description) || "",
  };
}

/* ===================== メイン ===================== */
export default function StoresClient() {
  const { uiLang } = useUILang(); // ← Jotai の UI 言語を使用（ピッカーは不要）

  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // フォーム（原文のみ編集）
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [base, setBase] = useState<StoreBase>({ name: "", address: "", description: "" });

  // 画像
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  // AI 原文補助（紹介文生成・上書き）
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiKeyword, setAiKeyword] = useState("");
  const [aiFeature, setAiFeature] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // 保存中
  const [submitting, setSubmitting] = useState(false);

  const gradient = useThemeGradient();
  const isDark = useMemo(() => {
    const darkThemes: ThemeKey[] = ["brandG", "brandH", "brandI"];
    return !!gradient && darkThemes.some((k) => gradient === THEMES[k]);
  }, [gradient]);

  const colRef: CollectionReference<DocumentData> = useMemo(() => collection(db, STORE_COL), []);

  /* ---------- 認証監視 ---------- */
  useEffect(() => onAuthStateChanged(auth, (u) => setIsAdmin(!!u)), []);

  /* ---------- 取得（旧スキーマ互換） ---------- */
  useEffect(() => {
    const q = fsQuery(colRef, orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: StoreDoc[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, any>;

          // base 正規化
          const base: StoreBase = {
            name: (data.base?.name ?? data.name ?? "").trim(),
            address: (data.base?.address ?? data.address ?? "").trim(),
            description: (data.base?.description ?? data.description ?? "").trim(),
          };

          // t 正規化（string 必須）
          const t: StoreTr[] = Array.isArray(data.t)
            ? (data.t as Array<Record<string, any>>).map((x): StoreTr => ({
                lang: x.lang as LangKey,
                name: (x.name ?? "").trim(),
                address: (x.address ?? "").trim(),
                description: (x.description ?? "").trim(),
              }))
            : [];

          return {
            id: d.id,
            base,
            t,
            imageURL: data.imageURL ?? "",
            originalFileName: data.originalFileName ?? undefined,
            order: data.order ?? 9999,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setStores(docs);
      },
      (e) => console.error(e)
    );
    return () => unsub();
  }, [colRef]);

  /* ---------- 並べ替え ---------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stores.findIndex((s) => s.id === String(active.id));
    const newIndex = stores.findIndex((s) => s.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(stores, oldIndex, newIndex);
    setStores(next);
    const batch = writeBatch(db);
    next.forEach((s, i) => batch.update(doc(db, STORE_COL, s.id), { order: i }));
    await batch.commit();
  };

  /* ---------- フォーム開閉 ---------- */
  const openAdd = () => {
    if (progress !== null || submitting || aiLoading) return;
    setFormMode("add");
    setEditingId(null);
    setBase({ name: "", address: "", description: "" });
    setFile(null);
  };

  const openEdit = (s: StoreDoc) => {
    if (progress !== null || submitting || aiLoading) return;
    setFormMode("edit");
    setEditingId(s.id);
    setBase({ ...s.base }); // 原文だけ編集
    setFile(null);
  };

  const closeForm = () => {
    if (progress !== null || submitting || aiLoading) return;
    setFormMode(null);
    setEditingId(null);
    setFile(null);
  };

  /* ---------- 全言語一括翻訳（保存用） ---------- */
  async function translateAllLanguages(input: StoreBase): Promise<StoreTr[]> {
    // LANGS は ja を含まない想定（含む場合でも問題なし：原文と重複しないだけ）
    const targets = LANGS.map((l) => l.key as LangKey);

    const jobs = targets.map(async (lang): Promise<StoreTr> => {
      try {
        // name + description
        const r1 = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: input.name, body: input.description || " ", target: lang }),
        });
        const d1 = (await r1.json()) as { title?: string; body?: string };

        // address（段落維持のため title 側を使用）
        let addr = "";
        if (input.address.trim()) {
          const r2 = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: input.address, body: " ", target: lang }),
          });
          const d2 = (await r2.json()) as { title?: string };
          addr = (d2.title ?? "").trim();
        }

        return {
          lang,
          name: (d1.title ?? "").trim(),
          description: (d1.body ?? "").trim(),
          address: addr,
        };
      } catch {
        // 失敗時も型は崩さない
        return { lang, name: "", address: "", description: "" };
      }
    });

    // ここは allSettled ではなく all。個々で try/catch 済みなので必ず成功。
    return await Promise.all(jobs);
  }

  /* ---------- 保存（新規/更新） ---------- */
  const saveStore = async () => {
    if (!base.name.trim() || !base.address.trim()) {
      alert("店舗名と住所は必須です");
      return;
    }

    setSubmitting(true);
    try {
      // 1) 原文から全言語を作成
      const allTranslations = await translateAllLanguages({
        name: base.name.trim(),
        address: base.address.trim(),
        description: base.description.trim(),
      });

      const isEdit = formMode === "edit" && !!editingId;
      const docRef = isEdit ? doc(colRef, editingId!) : doc(colRef);
      const id = docRef.id;

      // 2) 画像アップロード（必要時）
      let imageURL: string | undefined;
      let originalFileName: string | undefined;

      if (file) {
        const ext = getExtFromName(file.name);
        if (!ALLOWED_IMG_EXT.includes(ext)) {
          alert("画像は jpg / jpeg / png / webp を指定してください");
          setSubmitting(false);
          return;
        }
        const sref = storageRef(getStorage(), `${STORAGE_DIR}/${id}.${ext}`);
        setProgress(0);
        const task = uploadBytesResumable(sref, file, { contentType: file.type });

        await new Promise<void>((resolve, reject) => {
          task.on(
            "state_changed",
            (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
            (e) => reject(e),
            async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              imageURL = url.replace(
                "crepe-shop-homepage.appspot.com",
                "crepe-shop-homepage.firebasestorage.app"
              );
              originalFileName = file.name;
              resolve();
            }
          );
        });

        setProgress(null);

        if (isEdit) {
          const prev = stores.find((x) => x.id === id);
          const prevExt = getExtFromName(prev?.originalFileName);
          if (prevExt && prevExt !== ext) {
            await deleteObject(storageRef(getStorage(), `${STORAGE_DIR}/${id}.${prevExt}`)).catch(() => {});
          }
        }
      }

      // 3) Firestore 反映（翻訳は t に全部保存 / 互換 top-level も保存）
      const payload = {
        base: {
          name: base.name.trim(),
        // address/description は空文字も保存（型一貫）
          address: base.address.trim(),
          description: base.description.trim(),
        } satisfies StoreBase,
        t: allTranslations as StoreTr[],
        // 互換 top-level
        name: base.name.trim(),
        address: base.address.trim(),
        description: base.description.trim(),
        ...(imageURL ? { imageURL } : {}),
        ...(originalFileName ? { originalFileName } : {}),
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        await updateDoc(docRef, payload as any);
      } else {
        const tail = (stores.at(-1)?.order ?? stores.length - 1) + 1;
        await setDoc(docRef, { ...payload, order: tail, createdAt: serverTimestamp() } as any);
      }

      closeForm();
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
      setProgress(null);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- 削除 ---------- */
  const removeStore = async (s: StoreDoc) => {
    if (!confirm(`「${s.base.name}」を削除しますか？`)) return;
    try {
      await deleteDoc(doc(colRef, s.id));
      const oldExt = getExtFromName(s.originalFileName);
      if (oldExt) {
        await deleteObject(storageRef(getStorage(), `${STORAGE_DIR}/${s.id}.${oldExt}`)).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  /* ---------- AI 原文生成（成功で自動クローズ・上書き） ---------- */
  const generateDescription = async () => {
    if (!base.name.trim() || !base.address.trim()) {
      alert("店舗名と住所を先に入力してください");
      return;
    }
    if (!aiKeyword.trim() || !aiFeature.trim()) {
      alert("キーワードとイチオシを入力してください");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/generate-store-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: base.name.trim(),
          address: base.address.trim(),
          keyword: aiKeyword.trim(),
          feature: aiFeature.trim(),
        }),
      });
      const data = (await res.json()) as { description?: string; error?: string };
      if (res.ok && data?.description) {
        const out = String(data.description).trim();
        // ★ 上書き（要望どおり）
        setBase((prev) => ({ ...prev, description: out }));
        setShowAIModal(false);
        setAiKeyword("");
        setAiFeature("");
      } else {
        alert(data?.error || "生成に失敗しました");
      }
    } catch {
      alert("生成に失敗しました");
    } finally {
      setAiLoading(false);
    }
  };

  if (!gradient) return <CardSpinner />;

  /* ===================== JSX ===================== */
  return (
    <main className="max-w-5xl mx-auto p-4 mt-20">
      {/* 並べ替えリスト（言語は Jotai に追従） */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stores.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((s) => (
              <SortableStoreItem key={s.id} store={s}>
                {({ attributes, listeners, isDragging }) => (
                  <StoreCard
                    store={s}
                    isAdmin={isAdmin}
                    isDragging={isDragging}
                    isDark={isDark}
                    gradient={gradient!}
                    attributes={attributes}
                    listeners={listeners}
                    onEdit={openEdit}
                    onRemove={removeStore}
                    uiLang={uiLang}
                  />
                )}
              </SortableStoreItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 追加 FAB */}
      {isAdmin && formMode === null && (
        <button
          onClick={openAdd}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 cursor-pointer rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-pink-700 active:scale-95 transition disabled:opacity-50"
          disabled={submitting || progress !== null || aiLoading}
        >
          <Plus size={28} />
        </button>
      )}

      {/* フォームモーダル（多言語プレビューなし / テキストエリアはスクロール） */}
      {isAdmin && formMode && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div
            className={clsx(
              "bg-white rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-5 relative",
              (submitting || progress !== null || aiLoading) && "aria-busy"
            )}
          >
            {/* 保存中オーバーレイ */}
            {(submitting || progress !== null) && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-gray-800">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>{progress !== null ? `アップロード中… ${progress}%` : "保存中…"} </span>
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold text-center">
              {formMode === "edit" ? "店舗を編集" : "店舗を追加"}
            </h2>

            {/* 原文（日本語） */}
            <section className="space-y-3">
              <label className="text-sm font-medium">店舗名（原文）</label>
              <textarea
                rows={2}
                value={base.name}
                onChange={(e) => setBase((p) => ({ ...p, name: e.target.value }))}
                className="w-full border px-3 py-2 rounded whitespace-pre-wrap max-h-28 overflow-y-auto resize-y"
                placeholder="店舗名（日本語）"
                disabled={submitting || progress !== null}
              />
              <label className="text-sm font-medium">住所（原文）</label>
              <textarea
                rows={3}
                value={base.address}
                onChange={(e) => setBase((p) => ({ ...p, address: e.target.value }))}
                className="w-full border px-3 py-2 rounded whitespace-pre-wrap max-h-36 overflow-y-auto resize-y"
                placeholder="住所（日本語）改行・段落OK"
                disabled={submitting || progress !== null}
              />
              <label className="text-sm font-medium">紹介文（原文・任意）</label>
              <textarea
                rows={6}
                value={base.description}
                onChange={(e) => setBase((p) => ({ ...p, description: e.target.value }))}
                className="w-full border px-3 py-2 rounded whitespace-pre-wrap max-h-60 overflow-y-auto resize-y"
                placeholder="紹介文（日本語。複数段落OK）"
                disabled={submitting || progress !== null}
              />
            </section>

            {/* AI 原文補助（多言語プレビューは出さない） */}
            <div className="flex flex-col gap-2">
              <Button
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                onClick={() => setShowAIModal(true)}
                disabled={submitting || progress !== null}
              >
                AIで紹介文を生成
              </Button>
            </div>

            {/* 画像 */}
            <section className="space-y-2">
              <label className="block text-sm font-medium">（任意）画像</label>
              <input
                type="file"
                accept={ALLOWED_IMG_MIME.join(",")}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full h-10 bg-gray-400 text-white rounded-md file:text-white file:px-4 file:py-1 file:border-0 file:cursor-pointer"
                disabled={submitting || progress !== null}
              />
              {file && <p className="text-xs text-gray-600">選択中: {file.name}</p>}
              {progress !== null && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">アップロード中… {progress}%</p>
                  <div className="w-full h-2 bg-gray-300 rounded">
                    <div className="h-full bg-green-500 rounded transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </section>

            {/* 操作 */}
            <div className="flex justify-center gap-2">
              <Button onClick={saveStore} disabled={submitting || progress !== null} className="px-4 py-2 bg-green-600 text-white rounded">
                {submitting ? "保存中..." : "保存（全言語翻訳）"}
              </Button>
              <button onClick={closeForm} disabled={submitting || progress !== null} className="px-4 py-2 bg-gray-500 text-white rounded">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AIモーダル（成功で自動クローズ / 上書き） */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-center">紹介文をAIで生成</h3>
            <input
              type="text"
              placeholder="何の店舗か？（例: クレープ屋）"
              value={aiKeyword}
              onChange={(e) => setAiKeyword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              disabled={aiLoading || submitting}
            />
            <input
              type="text"
              placeholder="イチオシは？（例: チョコバナナ）"
              value={aiFeature}
              onChange={(e) => setAiFeature(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              disabled={aiLoading || submitting}
            />
            <div className="space-y-2">
              <Button
                className="bg-indigo-600 w-full disabled:opacity-50"
                disabled={!aiKeyword || !aiFeature || aiLoading || submitting}
                onClick={generateDescription}
              >
                {aiLoading ? "生成中..." : "生成する"}
              </Button>
              <Button className="bg-gray-300 w-full" variant="outline" onClick={() => setShowAIModal(false)} disabled={aiLoading || submitting}>
                閉じる
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ===================== Sortable Item / Card ===================== */
function SortableStoreItem({
  store,
  children,
}: {
  store: StoreDoc;
  children: (props: { attributes: any; listeners: any; isDragging: boolean }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: store.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

function StoreCard({
  store: s,
  isAdmin,
  isDragging,
  isDark,
  gradient,
  listeners,
  attributes,
  onEdit,
  onRemove,
  uiLang,
}: {
  store: StoreDoc;
  isAdmin: boolean;
  isDragging: boolean;
  isDark: boolean;
  gradient: string;
  listeners: any;
  attributes: any;
  onEdit: (s: StoreDoc) => void;
  onRemove: (s: StoreDoc) => void;
  uiLang: ReturnType<typeof useUILang>["uiLang"];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -150px 0px" });

  const loc = pickLocalized(s, uiLang);

  // 住所の1行目だけ地図リンク（選択言語の住所）
  const addrLines = (loc.address ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => Boolean(line));
  const primaryAddr = addrLines[0] ?? "";

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={clsx(
        "rounded-lg shadow relative transition-colors overflow-visible mt-6",
        "bg-gradient-to-b",
        gradient,
        isDragging ? "bg-yellow-100" : isDark ? "bg-black/40 text-white" : "bg-white"
      )}
    >
      {/* ドラッグハンドル */}
      {auth.currentUser !== null && (
        <div
          {...attributes}
          {...listeners}
          onTouchStart={(e) => e.preventDefault()}
          className="absolute -top-5 left-1/2 -translate-x-1/2 z-30 cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-10 h-10 rounded-full bg-white/90 text-gray-800 flex items-center justify-center shadow-md ring-1 ring-black/10 backdrop-blur">
            <Pin className="w-5 h-5" />
          </div>
        </div>
      )}

      {/* 画像 */}
      {s.imageURL && (
        <div className="relative w-full aspect-[1/1]">
          <Image
            src={s.imageURL}
            alt={loc.name || s.base.name}
            fill
            className="object-cover rounded-t-lg"
            unoptimized
          />
        </div>
      )}

      {/* 本文 */}
      <div className={clsx("p-4 space-y-2", isDark && "text-white")}>
        <h2 className="text-xl font-semibold whitespace-pre-wrap">{loc.name}</h2>

        <div className="text-sm">
          {primaryAddr && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primaryAddr)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx("underline", isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-700 hover:text-blue-900")}
            >
              {primaryAddr}
            </a>
          )}
          {addrLines.slice(1).map((ln: string, i: number) => (
            <div key={i} className="whitespace-pre-wrap">
              {ln}
            </div>
          ))}
        </div>

        {loc.description && <p className="text-sm whitespace-pre-wrap">{loc.description}</p>}
      </div>

      {isAdmin && (
        <div className="absolute top-2 right-2 flex gap-2">
          <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm" onClick={() => onEdit(s)}>
            編集
          </button>
          <button className="px-2 py-1 bg-red-600 text-white rounded text-sm" onClick={() => onRemove(s)}>
            削除
          </button>
        </div>
      )}
    </motion.div>
  );
}
