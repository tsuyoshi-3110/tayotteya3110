"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import MenuSectionCard from "@/components/MenuSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import Image from "next/image";
import { UploadTask } from "firebase/storage";

type Section = {
  id: string;
  title: string;
  order: number;
  siteKey: string;
  mediaType?: "image" | "video" | null;
  mediaUrl?: string | null;
  durationSec?: number | null;
};

export default function MenuPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 追加モーダル用: メディア選択
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaObjectUrl, setNewMediaObjectUrl] = useState<string | null>(
    null
  );
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setIsLoggedIn(!!user));
    return () => unsub();
  }, []);

  const fetchSections = async () => {
    const q = query(
      collection(db, "menuSections"),
      where("siteKey", "==", SITE_KEY),
      orderBy("order", "asc")
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Section, "id">),
    }));
    setSections(rows);
  };

  useEffect(() => {
    fetchSections();
  }, []);

  // ファイル選択
  const pickMedia = () => fileInputRef.current?.click();

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0] ?? null;
    e.currentTarget.value = "";
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      alert("画像または動画ファイルを選択してください。");
      return;
    }

    // ▼ 30秒制限（±1秒の誤差許容）
    if (isVideo) {
      try {
        const { duration } = await getVideoMetaFromFile(file);
        if (duration > 31) {
          // 31秒超は拒否
          alert(
            `動画は30秒以内にしてください。（選択：約${Math.round(
              duration
            )}秒）`
          );
          return;
        }
      } catch {
        alert(
          "動画の長さを取得できませんでした。別のファイルをお試しください。"
        );
        return;
      }
    }

    // プレビュー表示などは従来どおり
    if (newMediaObjectUrl) URL.revokeObjectURL(newMediaObjectUrl);
    setNewMediaFile(file);
    setNewMediaObjectUrl(URL.createObjectURL(file));
  };

  const cancelUpload = () => {
    try {
      uploadTaskRef.current?.cancel();
    } catch (e) {
      console.warn(e);
    } finally {
      setUploadOpen(false);
    }
  };

  async function getImageSize(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = document.createElement("img");
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        reject(new Error("Failed to load image"));
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  // 追加（アップロード付き）
  const handleAddSection = async () => {
    if (!newTitle.trim()) {
      alert("セクション名を入力してください");
      return;
    }

    try {
      setCreating(true);
      const newOrder = sections.length;

      // 1) 先にセクション作成（メディアは空で作る）
      const refDoc = await addDoc(collection(db, "menuSections"), {
        title: newTitle.trim(),
        order: newOrder,
        siteKey: SITE_KEY,
        mediaType: null,
        mediaUrl: null,
        durationSec: null,
        orientation: null,
        mediaWidth: null,
        mediaHeight: null,
      });

      // 2) メディアが選択されていればアップロード
      if (newMediaFile) {
        const isImage = newMediaFile.type.startsWith("image/");
        const isVideo = newMediaFile.type.startsWith("video/");
        if (!isImage && !isVideo) {
          alert("画像または動画ファイルを選択してください。");
          return;
        }

        // ▼ 動画は30秒制限（±1秒許容）
        let durationSec: number | null = null;
        let mediaWidth: number | null = null;
        let mediaHeight: number | null = null;
        let orientation: "portrait" | "landscape" = "landscape";

        if (isVideo) {
          const { duration, width, height } = await getVideoMetaFromFile(
            newMediaFile
          );
          if (duration > 31) {
            alert(
              `動画は30秒以内にしてください。（選択: 約${Math.round(
                duration
              )}秒）`
            );
            return;
          }
          durationSec = Math.round(duration);
          mediaWidth = width;
          mediaHeight = height;
          orientation = height > width ? "portrait" : "landscape";
        } else {
          const { width, height } = await getImageSize(newMediaFile);
          mediaWidth = width;
          mediaHeight = height;
          orientation = height > width ? "portrait" : "landscape";
        }

        const ext = getExt(newMediaFile.name) || (isImage ? "jpg" : "mp4");
        const path = `sections/${SITE_KEY}/${refDoc.id}/header.${ext}`;
        const sref = storageRef(getStorage(), path);

        // ▼ 進捗モーダルON
        setUploadPercent(0);
        setUploadOpen(true);
        const task = uploadBytesResumable(sref, newMediaFile, {
          contentType: newMediaFile.type,
        });
        uploadTaskRef.current = task;

        // task を Promise 化して待つ（キャンセル/失敗も拾う）
        await new Promise<void>((resolve, reject) => {
          task.on(
            "state_changed",
            (snap) => {
              const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
              setUploadPercent(pct);
            },
            (err) => reject(err),
            () => resolve()
          );
        });

        const url = await getDownloadURL(task.snapshot.ref);

        await updateDoc(doc(db, "menuSections", refDoc.id), {
          mediaType: isImage ? "image" : "video",
          mediaUrl: url,
          durationSec,
          orientation,
          mediaWidth,
          mediaHeight,
        });
      }

      // 3) 後始末 & 再取得
      setNewTitle("");
      setNewMediaFile(null);
      if (newMediaObjectUrl) {
        URL.revokeObjectURL(newMediaObjectUrl);
        setNewMediaObjectUrl(null);
      }
      setShowModal(false);
      await fetchSections();
    } catch (e: any) {
      if (e?.code === "storage/canceled") {
        // ユーザーがキャンセル
        console.info("upload canceled");
      } else {
        console.error(e);
        alert("セクションの追加に失敗しました。");
      }
    } finally {
      setCreating(false);
      setUploadOpen(false);
      uploadTaskRef.current = null;
    }
  };

  function UploadProgressModal({
    open,
    percent,
    onCancel,
    title = "アップロード中…",
  }: {
    open: boolean;
    percent: number; // 0-100
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
          <div className="mt-4 flex justify-end gap-2">
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

  const wrapperClass = `p-4 max-w-2xl mx-auto pt-20 ${
    isLoggedIn ? "pb-20" : ""
  }`;

  // 追加モーダル内のプレビュー
  const previewNode = useMemo(() => {
    if (!newMediaFile || !newMediaObjectUrl) return null;
    if (newMediaFile.type.startsWith("image/")) {
      return (
        <div className="relative w-full h-40 md:h-48 mb-2">
          <Image
            src={newMediaObjectUrl}
            alt="新規セクション画像プレビュー"
            fill
            className="object-cover rounded"
            sizes="100vw"
            unoptimized
          />
        </div>
      );
    }
    return (
      <video
        key={newMediaObjectUrl}
        src={newMediaObjectUrl}
        controls
        className="w-full rounded mb-2"
        preload="metadata"
      />
    );
  }, [newMediaFile, newMediaObjectUrl]);

  return (
    <div className="relative">
      <div className={wrapperClass}>
        {isLoggedIn && (
          <Button className="mb-4" onClick={() => setShowModal(true)}>
            ＋ セクションを追加
          </Button>
        )}

        {Array.isArray(sections) &&
          sections.map((section) => (
            <MenuSectionCard
              key={section.id}
              section={section}
              isLoggedIn={isLoggedIn}
              onTitleUpdate={(t) => {
                setSections((prev) =>
                  prev.map((s) =>
                    s.id === section.id ? { ...s, title: t } : s
                  )
                );
              }}
              onDeleteSection={() => {
                setSections((prev) => prev.filter((s) => s.id !== section.id));
              }}
            />
          ))}

        {/* ▼ 追加モーダル（画像/動画選択対応） */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">新しいセクションを追加</h2>

              <label className="text-sm font-medium">セクション名</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例：ネイル、ヘアカット"
                className="mb-3 mt-1"
              />

              <div className="mb-3">
                <div className="text-sm font-medium mb-1">メディア（任意）</div>
                {previewNode}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pickMedia}
                    disabled={creating}
                  >
                    画像/動画を選択（動画は30秒まで）
                  </Button>
                  {newMediaFile && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (newMediaObjectUrl)
                          URL.revokeObjectURL(newMediaObjectUrl);
                        setNewMediaFile(null);
                        setNewMediaObjectUrl(null);
                      }}
                      disabled={creating}
                    >
                      クリア
                    </Button>
                  )}
                </div>
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
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                >
                  キャンセル
                </Button>
                <Button onClick={handleAddSection} disabled={creating}>
                  {creating ? "追加中…" : "追加"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <UploadProgressModal
        open={uploadOpen}
        percent={uploadPercent}
        onCancel={cancelUpload}
        title="メディアをアップロード中…"
      />

      {isLoggedIn && (
        <div className="fixed bottom-0 left-0 w-full z-50 bg-blue-50 border-t border-blue-200 text-sm text-blue-800 px-4 py-3 shadow-lg">
          <div className="max-w-2xl mx-auto">
            <div className="font-semibold mb-0.5">操作ヒント</div>
            <div>
              行は右にスワイプ 👉 <strong>編集</strong> ／ 左にスワイプ 👈{" "}
              <strong>削除</strong> ができます。
            </div>
          </div>
        </div>
      )}
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
      // 後始末
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
