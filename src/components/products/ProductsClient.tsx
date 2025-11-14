// src/components/BackgroundMedia.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";

import { onAuthStateChanged } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { doc, getDoc, setDoc, deleteField } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ThemeKey } from "@/lib/themes";

import { Button } from "@/components/ui/button";
import imageCompression from "browser-image-compression";
import BroomDustLoader from "../FeatherDusterLoader";

import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import Image from "next/image";
import { v4 as uuid } from "uuid";
import AdminControls from "../backgroundVideo/AdminControls";

const META_REF = doc(db, "siteSettingsEditable", SITE_KEY);
const POSTER_EXT = ".jpg";

// 動画長さ制限（秒）
const MAX_VIDEO_SEC = 60;

// アップロード許可 MIME
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime"] as const;

type MediaType = "video" | "image";

type HeroItem = {
  src: string;
  type: MediaType;
};

type MetaDoc = {
  url?: string;
  type?: MediaType;
  themeGradient?: ThemeKey;
  imageUrls?: string[];

  heroItems?: HeroItem[];

  heroVideo?: {
    name?: string;
    description?: string;
    contentUrl?: string;
    uploadDate?: string;
    thumbnailUrl?: string;
    durationSec?: number;
    duration?: string;
  };
};

type FormMediaItem = {
  id: string;
  type: MediaType;
  mode: "existing" | "new";
  file?: File; // mode === "new" のときだけ
  existingSrc?: string; // mode === "existing" のときだけ
};

type SelectedMediaRow = {
  id: string;
  index: number;
  type: MediaType;
  label: string;
};

export default function BackgroundMedia() {
  const [heroItems, setHeroItems] = useState<HeroItem[]>([]);
  const [poster, setPoster] = useState<string | null>(null);
  const [heroVideoMeta, setHeroVideoMeta] = useState<MetaDoc["heroVideo"]>();

  const [ready, setReady] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("brandA");
  const [authChecked, setAuthChecked] = useState(false);

  const [status, setStatus] = useState<
    "loading" | "paid" | "unpaid" | "pending" | "canceled" | "setup"
  >("loading");

  // 編集モーダル用：現在の並び順を表現する配列
  const [formMedia, setFormMedia] = useState<FormMediaItem[]>([]);

  const uploading = progress !== null;

  /* =======================
     Stripe サブスク状態チェック
  ======================= */
  useEffect(() => {
    const checkPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("session_id");

      const apiUrl = sessionId
        ? `/api/stripe/verify-subscription?session_id=${sessionId}`
        : `/api/stripe/check-subscription?siteKey=${SITE_KEY}`;

      const res = await fetch(apiUrl);
      const json = await res.json();

      if (json.status === "active") setStatus("paid");
      else if (json.status === "pending_cancel") setStatus("pending");
      else if (json.status === "canceled") setStatus("canceled");
      else if (json.status === "setup_mode") setStatus("setup");
      else setStatus("unpaid");

      if (sessionId) {
        const cur = new URL(window.location.href);
        cur.searchParams.delete("session_id");
        window.history.replaceState({}, "", cur.toString());
      }
    };

    checkPayment();
  }, []);

  const loading = !ready && heroItems.length > 0;

  /* =======================
     管理者チェック（ログイン）
  ======================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  /* =======================
     Firestore から初期データ取得
  ======================= */
  useEffect(() => {
    (async () => {
      const snap = await getDoc(META_REF);
      if (!snap.exists()) return;
      const data = snap.data() as MetaDoc;

      if (data.themeGradient) setTheme(data.themeGradient);

      const items: HeroItem[] = [];

      // 新方式：heroItems 優先
      if (Array.isArray(data.heroItems) && data.heroItems.length > 0) {
        for (const item of data.heroItems) {
          if (!item?.src || !item?.type) continue;
          items.push({ src: item.src, type: item.type });
        }
      } else {
        // 互換：imageUrls / url + type から組み立て
        if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
          data.imageUrls.forEach((u) => {
            if (u) items.push({ src: u, type: "image" });
          });
        }
        if (data.type === "video" && data.url) {
          items.push({ src: data.url, type: "video" });
        }
      }

      setHeroItems(items);

      if (data.heroVideo) {
        setHeroVideoMeta(data.heroVideo);
      }

      const videoItem =
        items.find((m) => m.type === "video") ||
        (data.type === "video" && data.url
          ? { src: data.url, type: "video" as const }
          : null);

      if (videoItem) {
        if (data.heroVideo?.thumbnailUrl) {
          setPoster(data.heroVideo.thumbnailUrl);
        } else {
          setPoster(videoItem.src.replace(/\.mp4(\?.*)?$/, POSTER_EXT));
        }
      }
    })().catch((err) => console.error("背景データ取得失敗:", err));
  }, []);

  // 念のため5秒で ready true にするフォールバック
  useEffect(() => {
    const timeout = setTimeout(() => {
      setReady(true);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  /* =======================
     編集モーダルを開いたときに
     既存 heroItems を formMedia に展開
  ======================= */
  useEffect(() => {
    if (!editing) return;

    setFormMedia((prev) => {
      // すでに何か入っていれば（新しく追加中など）上書きしない
      if (prev.length > 0) return prev;

      if (!heroItems || heroItems.length === 0) return prev;

      const mapped = heroItems.map<FormMediaItem>((item) => ({
        id: uuid(),
        type: item.type,
        mode: "existing",
        existingSrc: item.src,
      }));
      return mapped;
    });
  }, [editing, heroItems]);

  /* =======================
     単枚画像アップロード（既存機能）
  ======================= */
  const uploadImage = async (imageFile: File) => {
    const imagePath = `images/public/${SITE_KEY}/wallpaper.jpg`;
    const imageRef = ref(getStorage(), imagePath);

    try {
      await deleteObject(imageRef);
    } catch {}

    const task = uploadBytesResumable(imageRef, imageFile);

    setProgress(0);

    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(percent);
      },
      (error) => {
        console.error("画像アップロード失敗:", error);
        setProgress(null);
        alert("アップロードに失敗しました");
      },
      async () => {
        const imageUrl = await getDownloadURL(imageRef);
        await setDoc(META_REF, { imageUrl }, { merge: true });

        setProgress(null);
        alert("画像を更新しました！");
      }
    );
  };

  /* =======================
     ヘッダー画像アップロード（既存機能）
  ======================= */
  const uploadHeaderImage = async (file: File) => {
    const imagePath = `images/public/${SITE_KEY}/headerLogo.jpg`;
    const imageRef = ref(getStorage(), imagePath);

    const compressedFile = await imageCompression(file, {
      maxWidthOrHeight: 160,
      maxSizeMB: 0.5,
      initialQuality: 0.9,
      useWebWorker: true,
    });

    try {
      await deleteObject(imageRef);
    } catch {}

    const task = uploadBytesResumable(imageRef, compressedFile);
    setProgress(0);

    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(percent);
      },
      (error) => {
        console.error("ロゴアップロード失敗:", error);
        setProgress(null);
        alert("アップロードに失敗しました");
      },
      async () => {
        const downloadURL = await getDownloadURL(imageRef);
        await setDoc(
          doc(db, "siteSettingsEditable", SITE_KEY),
          { headerLogoUrl: downloadURL },
          { merge: true }
        );
        setProgress(null);
        alert("ヘッダー画像を更新しました！");
      }
    );
  };

  /* =======================
     背景メディア保存処理
     （formMedia の並び順どおりに heroItems を作成）
  ======================= */
  const saveHeroMedia = async () => {
    if (!formMedia.length) {
      alert("画像または動画を選択してください。");
      return;
    }

    // 制約：画像最大3枚、動画最大1つ
    const imageCount = formMedia.filter((m) => m.type === "image").length;
    const videoCount = formMedia.filter((m) => m.type === "video").length;
    if (imageCount > 3) {
      alert("画像は最大3枚までです。");
      return;
    }
    if (videoCount > 1) {
      alert("動画は1つまでです。");
      return;
    }

    setProgress(0);
    const storage = getStorage();
    const bust = `?ts=${Date.now()}`;

    const newHeroItems: HeroItem[] = [];
    let posterUrlNext: string | undefined;
    let heroVideoMetaNext: MetaDoc["heroVideo"] | undefined = undefined;

    let uploadedCount = 0;
    const totalToUpload = formMedia.filter((m) => m.mode === "new").length || 1;
    const updateProgress = () => {
      uploadedCount += 1;
      setProgress(Math.round((uploadedCount / totalToUpload) * 100));
    };

    const uploadImageFile = async (file: File, index: number) => {
      const path = `images/public/${SITE_KEY}/hero_${index}.jpg`;
      const imageRef = ref(storage, path);
      try {
        await deleteObject(imageRef);
      } catch {}
      const task = uploadBytesResumable(imageRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", null, reject, () => resolve());
      });
      updateProgress();
      const url = (await getDownloadURL(imageRef)) + bust;
      return url;
    };

    const uploadVideoFile = async (file: File) => {
      const path = `videos/public/${SITE_KEY}/homeBackground.mp4`;
      const storageRef = ref(storage, path);

      try {
        await deleteObject(storageRef);
      } catch {}

      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", null, reject, () => resolve());
      });

      updateProgress();

      const downloadURL = (await getDownloadURL(storageRef)) + bust;

      // ポスター生成 & メタデータ
      let localPosterUrl: string | undefined;
      let durationSec: number | undefined;

      try {
        const objectUrl = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = objectUrl;
        video.muted = true;
        video.playsInline = true;

        durationSec = await new Promise<number | undefined>(
          (resolve, reject) => {
            video.onloadedmetadata = () => {
              resolve(
                isFinite(video.duration)
                  ? Math.round(video.duration)
                  : undefined
              );
            };
            video.onerror = () =>
              reject(new Error("動画メタデータの読み込みに失敗"));
          }
        );

        const seekTo = Math.min(1, Math.max(0.1, (video.duration || 1) * 0.1));
        await new Promise<void>((resolve, reject) => {
          video.currentTime = seekTo;
          video.onseeked = () => resolve();
          video.onerror = () => reject(new Error("動画シークに失敗"));
        });

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob: Blob = await new Promise((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("ポスター生成に失敗"))),
            "image/jpeg",
            0.82
          )
        );

        const posterPath = `videos/public/${SITE_KEY}/homeBackground.jpg`;
        const posterRef = ref(storage, posterPath);
        try {
          await deleteObject(posterRef);
        } catch {}

        const posterTask = uploadBytesResumable(posterRef, blob, {
          contentType: "image/jpeg",
        });
        await new Promise<void>((resolve, reject) => {
          posterTask.on("state_changed", null, reject, () => resolve());
        });
        localPosterUrl = (await getDownloadURL(posterRef)) + bust;
      } catch (e) {
        console.warn("ポスター生成に失敗。フォールバックを使用します:", e);
      }

      return {
        videoUrl: downloadURL,
        posterUrl: localPosterUrl,
        durationSec,
      };
    };

    try {
      let imageUploadIndex = 0;

      for (const m of formMedia) {
        if (m.type === "image") {
          // 既存画像
          if (m.mode === "existing" && m.existingSrc) {
            newHeroItems.push({
              type: "image",
              src: m.existingSrc,
            });
          }
          // 新規画像
          else if (m.mode === "new" && m.file) {
            const url = await uploadImageFile(m.file, imageUploadIndex);
            imageUploadIndex += 1;
            newHeroItems.push({ type: "image", src: url });
          }
        } else if (m.type === "video") {
          // 既存動画
          if (m.mode === "existing" && m.existingSrc) {
            newHeroItems.push({
              type: "video",
              src: m.existingSrc,
            });
            // heroVideoMeta は既存のものを再利用
            heroVideoMetaNext = heroVideoMeta;
            posterUrlNext = poster ?? undefined;
          }
          // 新規動画
          else if (m.mode === "new" && m.file) {
            const { videoUrl, posterUrl, durationSec } = await uploadVideoFile(
              m.file
            );
            newHeroItems.push({ type: "video", src: videoUrl });
            posterUrlNext = posterUrl;

            heroVideoMetaNext = {
              name: `${SITE_KEY} 紹介動画`,
              description: "サービス紹介動画です。",
              contentUrl: videoUrl,
              uploadDate: new Date().toISOString(),
              ...(posterUrl ? { thumbnailUrl: posterUrl } : {}),
              ...(durationSec
                ? {
                    durationSec,
                    duration: `PT${Math.max(1, durationSec)}S`,
                  }
                : {}),
            };
          }
        }
      }

      const hasVideo = newHeroItems.some((m) => m.type === "video");

      const heroVideoToSave =
        hasVideo && (heroVideoMetaNext || heroVideoMeta)
          ? heroVideoMetaNext || heroVideoMeta
          : undefined;

      await setDoc(
        META_REF,
        {
          // 旧フィールドとの互換用
          type: newHeroItems.length === 1 ? newHeroItems[0].type : undefined,
          url: newHeroItems.find((m) => m.type === "video")?.src,
          imageUrls: newHeroItems
            .filter((m) => m.type === "image")
            .map((m) => m.src),

          // 新フィールド
          themeGradient: theme,
          heroItems: newHeroItems,
          heroVideo: hasVideo
            ? heroVideoToSave ?? deleteField()
            : deleteField(),
        },
        { merge: true }
      );

      setHeroItems(newHeroItems);

      if (posterUrlNext) {
        setPoster(posterUrlNext);
      } else if (hasVideo) {
        const v = newHeroItems.find((m) => m.type === "video");
        if (v) {
          setPoster(v.src.replace(/\.mp4(\?.*)?$/, POSTER_EXT));
        }
      } else {
        setPoster(null);
      }

      setHeroVideoMeta(heroVideoToSave);
      setReady(false);
      setProgress(null);
      setEditing(false);
      setFormMedia([]);
      alert("背景メディアを更新しました！");
    } catch (e) {
      console.error("背景メディアの更新に失敗:", e);
      alert("更新に失敗しました");
      setProgress(null);
    }
  };

  /* =======================
     選択中メディア一覧（モーダル用）
     並べ替え表示用の行データ
  ======================= */
  const selectedMediaRows: SelectedMediaRow[] = formMedia.map((m, index) => {
    let name = "";
    if (m.mode === "new" && m.file) {
      name = m.file.name;
    } else if (m.mode === "existing" && m.existingSrc) {
      const last = m.existingSrc.split("/").pop() ?? "";
      name = last.split("?")[0] || "(既存メディア)";
    } else {
      name = "(不明なメディア)";
    }
    return {
      id: m.id,
      index,
      type: m.type,
      label: name,
    };
  });

  const moveRow = (from: number, to: number) => {
    setFormMedia((prev) => {
      const total = prev.length;
      if (to < 0 || to >= total) return prev;
      const clone = [...prev];
      const [removed] = clone.splice(from, 1);
      clone.splice(to, 0, removed);
      return clone;
    });
  };

  const removeRow = (index: number) => {
    setFormMedia((prev) => prev.filter((_, i) => i !== index));
  };

  /* =======================
     解約予約中の「解約取り消し」ボタン
  ======================= */
  const pendingButton = status === "pending" && isAdmin && (
    <Button
      className="fixed bottom-4 right-4 z-50 bg-yellow-500 text-white shadow-lg"
      onClick={async () => {
        try {
          const res = await fetch("/api/stripe/resume-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ siteKey: SITE_KEY }),
          });
          if (res.ok) {
            alert("解約予約を取り消しました！");
            location.reload();
          } else {
            alert("再開に失敗しました");
          }
        } catch {
          alert("再開に失敗しました");
        }
      }}
    >
      解約を取り消す
    </Button>
  );

  return (
    <div className="fixed inset-0 top-12">
      {pendingButton}

      {/* 背景メディア表示（画像1〜3枚＋動画1つまで） */}
      <HeroMedia
        items={heroItems}
        poster={poster ?? undefined}
        onFirstReady={() => setReady(true)}
      />

      {/* 背景読み込み中ローダー */}
      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <BroomDustLoader label="読み込み中…" size={100} speed={1} />
        </div>
      )}

      {authChecked && isAdmin && (
        <>
          {/* アップロード処理中のプログレスオーバーレイ */}
          {progress !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-white rounded-lg p-6 shadow-md w-full max-w-sm">
                <p className="text-center text-gray-800 mb-2">
                  アップロード中… {progress}%
                </p>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 既存の AdminControls（編集ボタン等） */}
          <AdminControls
            editing={editing}
            setEditing={setEditing}
            uploading={uploading}
            uploadImage={uploadImage}
            uploadHeaderImage={uploadHeaderImage}
          />

          {/* 背景メディア編集モーダル */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md bg-white rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-center">
                  背景メディアの編集
                </h2>

                <p className="text-xs text-gray-500">
                  画像は最大3枚、動画は1つまで選択できます。
                  並び順がそのままスライドショーの順番になります。
                  （保存すると既存の背景メディアはこの内容で上書きされます）
                </p>

                {/* 画像（最大3枚） */}
                <div className="space-y-1 mt-2">
                  <label className="text-sm">画像（最大3枚）</label>
                  <input
                    type="file"
                    accept={IMAGE_MIME_TYPES.join(",")}
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).filter(
                        (f) => IMAGE_MIME_TYPES.includes(f.type)
                      );
                      if (!files.length) {
                        e.target.value = "";
                        return;
                      }
                      setFormMedia((prev) => {
                        const currentImages = prev.filter(
                          (m) => m.type === "image"
                        );
                        const remain = 3 - currentImages.length;
                        if (remain <= 0) {
                          alert("画像は最大3枚までです");
                          return prev;
                        }
                        const toAdd = files
                          .slice(0, remain)
                          .map<FormMediaItem>((file) => ({
                            id: uuid(),
                            type: "image",
                            mode: "new",
                            file,
                          }));
                        return [...prev, ...toAdd];
                      });
                      e.target.value = "";
                    }}
                    className="bg-gray-500 text-white w-full h-10 px-3 py-1 rounded"
                    disabled={uploading}
                  />
                </div>

                {/* 動画（任意・1つまで） */}
                <div className="space-y-1">
                  <label className="text-sm">動画（任意・1つまで）</label>
                  <input
                    type="file"
                    accept={VIDEO_MIME_TYPES.join(",")}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (!f) {
                        e.target.value = "";
                        return;
                      }
                      if (!VIDEO_MIME_TYPES.includes(f.type as any)) {
                        alert("対応していない動画形式です。mp4 を推奨します。");
                        e.target.value = "";
                        return;
                      }

                      // 動画長さチェック
                      const blobURL = URL.createObjectURL(f);
                      const vid = document.createElement("video");
                      vid.preload = "metadata";
                      vid.src = blobURL;
                      vid.onloadedmetadata = () => {
                        const duration = vid.duration;
                        URL.revokeObjectURL(blobURL);
                        if (isFinite(duration) && duration > MAX_VIDEO_SEC) {
                          alert(`動画は ${MAX_VIDEO_SEC} 秒以内にしてください`);
                          (e.target as HTMLInputElement).value = "";
                          return;
                        }
                        setFormMedia((prev) => {
                          const hasVideo = prev.some((m) => m.type === "video");
                          if (hasVideo) {
                            alert("動画は1つまでです");
                            return prev;
                          }
                          return [
                            ...prev,
                            {
                              id: uuid(),
                              type: "video",
                              mode: "new",
                              file: f,
                            },
                          ];
                        });
                        (e.target as HTMLInputElement).value = "";
                      };
                    }}
                    className="bg-gray-500 text-white w-full h-10 px-3 py-1 rounded"
                    disabled={uploading}
                  />
                </div>

                {/* 選択中メディア一覧（並べ替え可能） */}
                {selectedMediaRows.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-semibold">選択中のメディア</p>
                    {selectedMediaRows.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between rounded border px-3 py-2 text-sm bg-gray-50"
                      >
                        <span className="truncate">
                          {row.index + 1}.{" "}
                          {row.type === "image" ? "画像" : "動画"}（{row.label}
                          ）
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveRow(row.index, row.index - 1)}
                            disabled={uploading || row.index === 0}
                            className="text-xs px-1 py-0.5 border rounded bg-white disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRow(row.index, row.index + 1)}
                            disabled={
                              uploading ||
                              row.index === selectedMediaRows.length - 1
                            }
                            className="text-xs px-1 py-0.5 border rounded bg-white disabled:opacity-40"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(row.index)}
                            disabled={uploading}
                            className="text-red-600 text-xs underline disabled:opacity-40"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={saveHeroMedia}
                    disabled={uploading || formMedia.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      if (uploading) return;
                      setEditing(false);
                      setFormMedia([]);
                    }}
                    disabled={uploading}
                    className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* =======================
   背景メディア表示コンポーネント
   画像1〜3枚＋動画1本を順番に自動スライド
   （動画が出ている間はスライド停止）
======================= */
function HeroMedia({
  items,
  poster,
  onFirstReady,
}: {
  items: HeroItem[];
  poster?: string;
  onFirstReady?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const readyFiredRef = useRef(false);

  const hasItems = items && items.length > 0;
  const total = hasItems ? items.length : 0;
  const safeIndex = total === 0 ? 0 : ((currentIndex % total) + total) % total;
  const active = hasItems ? items[safeIndex] : null;
  const isVideo = !!active && active.type === "video";

  const fireReadyOnce = () => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    onFirstReady?.();
  };

  // 自動スライド（動画表示中は止める）
  useEffect(() => {
    if (!hasItems) return;
    if (total <= 1) return;
    if (isVideo) return;

    const id = window.setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        return next >= total ? 0 : next;
      });
    }, 5000);

    return () => window.clearInterval(id);
  }, [hasItems, total, isVideo]);

  if (!hasItems || !active) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {isVideo ? (
        <video
          key={active.src}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          loop={total === 1}
          preload="auto"
          poster={poster ?? ""}
          onLoadedMetadata={fireReadyOnce}
        >
          <source src={active.src} type="video/mp4" />
        </video>
      ) : (
        <Image
          key={active.src}
          src={active.src}
          alt="背景メディア"
          fill
          className="object-cover"
          sizes="100vw"
          priority
          onLoadingComplete={fireReadyOnce}
        />
      )}
    </div>
  );
}
