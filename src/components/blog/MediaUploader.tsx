// components/blog/MediaUploader.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { getDownloadURL, ref, uploadBytesResumable, UploadTask } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { v4 as uuid } from "uuid";
import { BlogMedia } from "@/types/blog";
import { Button } from "@/components/ui/button";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

type Props = {
  postIdForPath?: string;
  value: BlogMedia[];                    // ← 外側 state（必ず最大1件に）
  onChange: (next: BlogMedia[]) => void;
};

export default function MediaUploader({ postIdForPath, value, onChange }: Props) {
  // モーダル & 進捗
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overallPct, setOverallPct] = useState(0);
  const [currentLabel, setCurrentLabel] = useState<string>("");
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // refs
  const totalBytesRef = useRef(0);
  const uploadedBytesRef = useRef(0);
  const taskRef = useRef<UploadTask | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetProgress = () => {
    setIsUploading(false);
    setErrorMsg(null);
    setOverallPct(0);
    setCurrentLabel("");
    totalBytesRef.current = 0;
    uploadedBytesRef.current = 0;
    taskRef.current = null;
    // 選択名は残してOK（消したい場合は setSelectedName(null)）
  };

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;

    // 表示用
    setSelectedName(file.name);

    // 動画なら60秒制限チェック
    const isVideo = file.type.startsWith("video/");
    if (isVideo) {
      const duration = await new Promise<number>((resolve, reject) => {
        const el = document.createElement("video");
        el.preload = "metadata";
        el.onloadedmetadata = () => {
          const d = el.duration || 0;
          if (d > 60) reject(new Error("動画は60秒以内にしてください。"));
          resolve(d);
        };
        el.onerror = () => reject(new Error("動画メタデータの取得に失敗しました。"));
        el.src = URL.createObjectURL(file);
      }).catch((e) => {
        setErrorMsg(e?.message ?? "動画の検証に失敗しました。");
        return null;
      });
      if (duration === null) return;
    }

    // アップロード
    setIsUploading(true);
    setErrorMsg(null);
    setOverallPct(0);
    setCurrentLabel("アップロードを開始");

    totalBytesRef.current = file.size;
    uploadedBytesRef.current = 0;

    const safePostId = postIdForPath ?? "temp";
    const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
    const fileId = uuid();
    const path = `siteBlogs/${SITE_KEY}/posts/${safePostId}/${fileId}.${ext}`;
    const storageRef = ref(storage, path);

    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
    taskRef.current = task;

    try {
      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            uploadedBytesRef.current = snap.bytesTransferred;
            const pct = Math.max(
              0,
              Math.min(100, Math.round((uploadedBytesRef.current / (totalBytesRef.current || 1)) * 100))
            );
            setOverallPct(pct);
            setCurrentLabel("アップロード中…");
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      const url = await getDownloadURL(storageRef);

      // BlogMedia（undefined を含めない）— 1枚に統一
      const next: BlogMedia[] = [
        {
          type: isVideo ? "video" : "image",
          url,
          path,
        },
      ];

      setCurrentLabel("アップロード完了");
      setOverallPct(100);

      // ← 既存があっても必ず置き換え（最大1件運用）
      onChange(next);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "アップロードに失敗しました。");
    } finally {
      setTimeout(() => resetProgress(), 500);
    }
  }, [onChange, postIdForPath]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.currentTarget.files?.[0] ?? null;
    onFile(f);
  };

  const cancelUpload = () => {
    try { taskRef.current?.cancel(); } catch {}
    setErrorMsg("アップロードをキャンセルしました。");
    setTimeout(() => resetProgress(), 500);
  };

  const hasExisting = (value?.length ?? 0) > 0;
  const buttonText = hasExisting ? "ファイルを変更" : "ファイルを選択";

  return (
    <>
      {/* ファイル選択（1枚限定） */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button asChild>
            <label className="cursor-pointer">
              {buttonText}
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }} // 同じファイルでも発火
                onChange={onInputChange}
              />
            </label>
          </Button>

          {hasExisting && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onChange([]);          // 既存をクリア（非表示運用のためプレビューもなし）
                setSelectedName(null);
              }}
            >
              クリア
            </Button>
          )}

          <span className="text-xs text-muted-foreground">※ 画像/動画は1枚のみ（動画は60秒以内）</span>
        </div>

        {/* 選択名の表示（プレビューは出さない） */}
        {selectedName && !isUploading && (
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            選択中: <span className="font-medium">{selectedName}</span>
          </div>
        )}
      </div>

      {/* 進捗モーダル（プレビューなし） */}
      {isUploading && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
          <div className="w-[92%] max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 text-base font-semibold">アップロード中</div>

            {selectedName && (
              <div className="mb-3 rounded-md border bg-muted/30 p-2 text-xs">
                ファイル: <span className="font-medium">{selectedName}</span>
              </div>
            )}

            <div className="mb-3 text-sm text-muted-foreground">{currentLabel || "処理中…"}</div>

            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-black transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div className="mb-4 text-right text-xs tabular-nums">{overallPct}%</div>

            {errorMsg && (
              <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{errorMsg}</div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={cancelUpload}>キャンセル</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
