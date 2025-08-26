// components/blog/BlockEditor.tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { BlogBlock } from "@/types/blog";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { storage } from "@/lib/firebase";
import {
  ref as sRef,
  getDownloadURL,
  uploadBytesResumable,
  UploadTask,
} from "firebase/storage";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { THEMES, ThemeKey } from "@/lib/themes";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { GripVertical } from "lucide-react";

// dnd-kit
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  /** ブロック配列（親が state を保持） */
  value: BlogBlock[];
  /** ブロック配列の変更通知 */
  onChange: (next: BlogBlock[]) => void;
  /** 直接 posts/{postId}/ に置きたいとき postId を指定。新規は null/undefined で temp に置く */
  postIdForPath?: string | null;
};

const DARK_KEYS: ThemeKey[] = ["brandH", "brandG", "brandI"];

/* ========== Sortable 子コンポーネント ========== */
function SortableBlockCard({
  id,
  isDark,
  children,
  onMoveUp,
  onMoveDown,
  onAddTextBelow,
  onAddMediaBelow,
  onDelete,
  disableUp,
  disableDown,
}: {
  id: string;
  isDark: boolean;
  children: React.ReactNode;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddTextBelow: () => void;
  onAddMediaBelow: () => void;
  onDelete: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border p-4",
        isDark ? "border-white/15 bg-black/10" : "border-black/10 bg-white",
        isDragging && "shadow-xl ring-2 ring-blue-400/40"
      )}
    >
      {/* 操作列（左にドラッグ用ハンドル） */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Drag handle：ここを掴むとドラッグ開始 */}
        <button
          className={clsx(
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
            isDark ? "border-white/15 bg-black/30 text-white/80" : "border-black/10 bg-gray-50 text-gray-700",
            "cursor-grab active:cursor-grabbing"
          )}
          aria-label="ドラッグして並び替え"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
          並び替え
        </button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onMoveUp}
          disabled={disableUp}
          aria-label="上へ"
        >
          ↑
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onMoveDown}
          disabled={disableDown}
          aria-label="下へ"
        >
          ↓
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onAddTextBelow}>
          下にテキスト
        </Button>
        <Button type="button" size="sm" onClick={onAddMediaBelow}>
          下に画像/動画
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={onDelete}>
          削除
        </Button>
      </div>

      {/* ブロック本体 */}
      {children}
    </div>
  );
}

/* ========== メイン ========== */
export default function BlockEditor({ value, onChange, postIdForPath }: Props) {
  // ==== テーマ判定 ====
  const gradient = useThemeGradient();
  const isDark = useMemo(
    () => !!gradient && DARK_KEYS.some((k) => THEMES[k] === gradient),
    [gradient]
  );
  const textClass = isDark ? "text-white" : "text-black";
  const subTextClass = isDark ? "text-white/70" : "text-muted-foreground";
  const cardClass = isDark ? "border-white/15 bg-black/10" : "border-black/10 bg-white";

  // ==== アップロード系 ====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskRef = useRef<UploadTask | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ==== DnD センサー ====
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  // ==== ユーティリティ ====
  const insertAt = useCallback(
    (idx: number, block: BlogBlock) => {
      const next = value.slice();
      next.splice(idx, 0, block);
      onChange(next);
    },
    [value, onChange]
  );

  const updateAt = useCallback(
    (idx: number, patch: Partial<BlogBlock>) => {
      const next = value.slice();
      next[idx] = { ...next[idx], ...patch } as BlogBlock;
      onChange(next);
    },
    [value, onChange]
  );

  const removeAt = useCallback(
    (idx: number) => {
      const next = value.slice();
      next.splice(idx, 1);
      onChange(next);
    },
    [value, onChange]
  );

  const move = useCallback(
    (idx: number, dir: -1 | 1) => {
      const to = idx + dir;
      if (to < 0 || to >= value.length) return;
      const next = value.slice();
      const [b] = next.splice(idx, 1);
      next.splice(to, 0, b);
      onChange(next);
    },
    [value, onChange]
  );

  // ==== DnD: 並び替え確定 ====
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = value.findIndex((b) => b.id === active.id);
    const newIndex = value.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(value, oldIndex, newIndex));
  };

  // ==== メディア追加 ====
  const handleAddMediaBelow = (idx: number) => {
    (fileInputRef.current as any).__insertIndex = Math.max(0, idx + 1);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0] || null;
    e.currentTarget.value = "";
    if (!file) return;

    // 動画は60秒制限
    const isVideo = file.type.startsWith("video/");
    if (isVideo) {
      const objectUrl = URL.createObjectURL(file);
      const ok = await new Promise<boolean>((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => {
          const dur = v.duration || 0;
          URL.revokeObjectURL(objectUrl);
          if (dur > 60) {
            setErrorMsg("動画は60秒以内にしてください。");
            resolve(false);
          } else {
            resolve(true);
          }
        };
        v.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          setErrorMsg("動画メタデータの取得に失敗しました。");
          resolve(false);
        };
        v.src = objectUrl;
      });
      if (!ok) return;
    }

    // アップロード開始
    setErrorMsg(null);
    setUploadingName(file.name);
    setUploadPct(0);

    const safePostId = postIdForPath || "temp";
    const ext =
      (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
    const fileId = uuid();
    const path = `siteBlogs/${SITE_KEY}/posts/${safePostId}/${fileId}.${ext}`;
    const ref = sRef(storage, path);

    const task = uploadBytesResumable(ref, file, { contentType: file.type });
    taskRef.current = task;

    try {
      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round(
              (snap.bytesTransferred / (snap.totalBytes || 1)) * 100
            );
            setUploadPct(pct);
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      const url = await getDownloadURL(ref);
      const insertIndex =
        (fileInputRef.current as any).__insertIndex ?? value.length;

      const block: BlogBlock =
        isVideo
          ? { id: uuid(), type: "video", url, path }
          : { id: uuid(), type: "image", url, path, alt: "" };

      const next = value.slice();
      next.splice(insertIndex, 0, block);
      onChange(next);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message ?? "アップロードに失敗しました。");
    } finally {
      setTimeout(() => {
        setUploadPct(null);
        setUploadingName(null);
        taskRef.current = null;
      }, 300);
    }
  };

  const cancelUpload = () => {
    try {
      taskRef.current?.cancel();
    } catch {}
    setErrorMsg("アップロードをキャンセルしました。");
    setTimeout(() => {
      setUploadPct(null);
      setUploadingName(null);
      taskRef.current = null;
    }, 200);
  };

  // ==== テキスト追加 ====
  const addTextBelow = (idx: number) => {
    const block: BlogBlock = { id: uuid(), type: "p", text: "" } as any;
    insertAt(Math.max(0, idx + 1), block);
  };

  const addTextTail = () => {
    onChange([...(value || []), { id: uuid(), type: "p", text: "" } as any]);
  };

  const addMediaTail = () => {
    (fileInputRef.current as any).__insertIndex = value.length;
    fileInputRef.current?.click();
  };

  // ==== レンダリング ====
  return (
    <div className={clsx("space-y-4", textClass)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={value.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {/* ブロック列 */}
          <div className="space-y-4">
            {value.length === 0 && (
              <div className={clsx("rounded-2xl border p-4 text-sm", cardClass, subTextClass)}>
                まだブロックがありません。下の「テキストを追加」または「画像/動画を追加」を押してください。
              </div>
            )}

            {value.map((b, i) => (
              <SortableBlockCard
                key={b.id}
                id={b.id}
                isDark={isDark}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, +1)}
                onAddTextBelow={() => addTextBelow(i)}
                onAddMediaBelow={() => handleAddMediaBelow(i)}
                onDelete={() => removeAt(i)}
                disableUp={i === 0}
                disableDown={i === value.length - 1}
              >
                {/* ブロック本体 */}
                {b.type === "p" ? (
                  <textarea
                    value={(b as any).text || ""}
                    onChange={(e) =>
                      updateAt(i, { ...(b as any), text: e.target.value })
                    }
                    className={clsx(
                      "w-full resize-y rounded-md border p-2 outline-none",
                      isDark
                        ? "bg-black/20 border-white/15 text-white placeholder:text-white/40"
                        : "bg-white border-black/10 text-black placeholder:text-black/40"
                    )}
                    placeholder="本文（段落）"
                    rows={6}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-lg border border-black/10">
                      {b.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(b as any).url}
                          alt={("alt" in (b as any) && (b as any).alt) || ""}
                          className="max-h-[420px] w-full bg-black/5 object-contain"
                        />
                      ) : (
                        <video
                          src={(b as any).url}
                          controls
                          playsInline
                          className="max-h-[420px] w-full bg-black/5"
                        />
                      )}
                    </div>

                    {b.type === "image" && (
                      <input
                        className={clsx(
                          "w-full rounded-md border p-2 text-sm",
                          isDark
                            ? "bg-black/20 border-white/15 text-white placeholder:text-white/40"
                            : "bg-white border-black/10 text-black placeholder:text-black/40"
                        )}
                        placeholder="代替テキスト（任意）"
                        value={("alt" in (b as any) && (b as any).alt) || ""}
                        onChange={(e) =>
                          updateAt(i, { ...(b as any), alt: e.target.value })
                        }
                      />
                    )}

                    {(b as any).path && (
                      <div className={clsx("text-xs break-all", subTextClass)}>
                        {(b as any).path}
                      </div>
                    )}
                  </div>
                )}
              </SortableBlockCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 末尾に追加 */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={addTextTail}>
          テキストを追加
        </Button>
        <Button type="button" onClick={addMediaTail}>
          画像/動画を追加
        </Button>
        <span className={clsx("text-xs", subTextClass)}>※ 動画は60秒以内</span>
      </div>

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onFileChange}
      />

      {/* アップロード進捗オーバーレイ */}
      {(uploadPct !== null || errorMsg) && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
          <div
            className={clsx(
              "w-[92%] max-w-md rounded-2xl p-5 shadow-xl",
              isDark ? "bg-gray-900 text-white" : "bg-white text-black"
            )}
          >
            <div className="mb-2 text-base font-semibold">
              {uploadPct !== null ? "アップロード中" : "お知らせ"}
            </div>
            {uploadingName && (
              <div className={clsx("mb-3 text-sm", subTextClass)}>
                {uploadingName}
              </div>
            )}

            {uploadPct !== null && (
              <>
                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
                <div
                  className={clsx(
                    "mb-2 text-right text-xs tabular-nums",
                    subTextClass
                  )}
                >
                  {uploadPct}%
                </div>
              </>
            )}

            {errorMsg && (
              <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="mt-2 flex items-center justify-end gap-2">
              {uploadPct !== null && (
                <Button type="button" variant="secondary" onClick={cancelUpload}>
                  キャンセル
                </Button>
              )}
              {errorMsg && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setErrorMsg(null)}
                >
                  閉じる
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
