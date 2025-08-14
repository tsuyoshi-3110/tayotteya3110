"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  DocumentData,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
  deleteObject,
} from "firebase/storage";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CardSpinner from "./CardSpinner";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

/* ───────── 定数 ───────── */

const STORAGE_PATH = `sitePages/${SITE_KEY}/about`;
const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = [
  "video/mp4", // mp4（推奨）→ HLS 変換可
  "video/quicktime", // mov（推奨）→ HLS 変換可
  // 以下はアップロード可だが、Cloud Functions の変換対象外ならそのままMP4等として再生されます
  "video/webm",
  "video/ogg",
  "video/x-m4v",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/mpeg",
  "video/3gpp",
  "video/3gpp2",
];
const MAX_VIDEO_SEC = 120;

/* ───────── 型 ───────── */
type MediaType = "image" | "video" | undefined;

export default function AboutClient() {
  /* ----- 表示用状態 ----- */
  const [contentText, setContentText] = useState("");
  const [contentMediaUrl, setContentMediaUrl] = useState<string | undefined>();
  const [contentMediaType, setContentMediaType] = useState<MediaType>();

  /* ----- 編集用状態 ----- */
  const [draftText, setDraftText] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);

  /* ----- その他状態 ----- */
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [saving, setSaving] = useState(false);

  const [keywords, setKeywords] = useState(["", "", ""]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // 進捗 0-100、アップロードタスクを保持
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadTask, setUploadTask] = useState<ReturnType<
    typeof uploadBytesResumable
  > | null>(null);

  const [contentFileName, setContentFileName] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const nonEmptyKeywords = keywords.filter((k) => k.trim());
  const gradient = useThemeGradient();
  const docRef = useMemo(
    () => doc(db, "sitePages", SITE_KEY, "pages", "about"),
    []
  );

  // Video refs for HLS playback
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any | null>(null);

  useEffect(() => {
    setMediaLoaded(false);
  }, [contentMediaUrl, previewURL]);

  /* ───────── 認証監視 ───────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setIsAdmin(!!u));
    return unsub;
  }, []);

  /* ───────── 初期データ取得 ───────── */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = snap.data() as DocumentData;
          setContentText(d.text ?? "");
          setDraftText(d.text ?? "");
          setContentFileName(d.fileName);
          setContentMediaUrl(d.mediaUrl);
          setContentMediaType(d.mediaType);
        }
      } finally {
        setLoadingDoc(false);
      }
    })();
  }, [docRef]);

  /* ───────── HLS 再生制御（閲覧側）───────── */
  useEffect(() => {
    if (contentMediaType !== "video" || !contentMediaUrl) {
      // 動画でない場合は後始末だけ
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // 以前の再生を完全停止
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
    try {
      video.pause();
    } catch {}
    video.removeAttribute("src");
    video.load();
    setMediaLoaded(false);

    // 自動再生できるように属性＆プロパティ両方セット（iOS対策）
    video.muted = true;
    video.setAttribute("muted", "");
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const safePlay = () => {
      video.play().catch(() => {
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            video.play().catch(() => {});
            document.removeEventListener("visibilitychange", onVisible);
          }
        };
        document.addEventListener("visibilitychange", onVisible);
        setTimeout(() => video.play().catch(() => {}), 200);
      });
    };

    const isHls = /\.m3u8(\?|$)/i.test(contentMediaUrl);
    let cancelled = false;

    (async () => {
      if (isHls) {
        // Safariはネイティブ、その他は hls.js
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = contentMediaUrl;
          video.addEventListener(
            "loadedmetadata",
            () => {
              setMediaLoaded(true);
              safePlay();
            },
            { once: true }
          );
          video.load();
        } else {
          const { default: Hls } = await import("hls.js");
          if (cancelled) return;

          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              capLevelToPlayerSize: true,
              maxBufferLength: 10,
              backBufferLength: 0,
              lowLatencyMode: false,
            });
            hlsRef.current = hls;
            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, () =>
              hls.loadSource(contentMediaUrl)
            );
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setMediaLoaded(true);
              safePlay();
            });
            hls.on(Hls.Events.ERROR, (_, data) => {
              // 失敗時はフォールバック
              if (data?.fatal) {
                try {
                  hls.destroy();
                } catch {}
                hlsRef.current = null;
                video.src = contentMediaUrl;
                video.addEventListener(
                  "loadedmetadata",
                  () => {
                    setMediaLoaded(true);
                    safePlay();
                  },
                  { once: true }
                );
                video.load();
              }
            });
          } else {
            // 古いブラウザ用フォールバック
            video.src = contentMediaUrl;
            video.addEventListener(
              "loadedmetadata",
              () => {
                setMediaLoaded(true);
                safePlay();
              },
              { once: true }
            );
            video.load();
          }
        }
      } else {
        // MP4/MOV 等の直再生
        video.src = contentMediaUrl;
        video.addEventListener(
          "loadedmetadata",
          () => {
            setMediaLoaded(true);
            safePlay();
          },
          { once: true }
        );
        video.load();
      }
    })();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      try {
        video.pause();
      } catch {}
      video.removeAttribute("src");
      video.load();
    };
  }, [contentMediaType, contentMediaUrl]);

  /* ───────── ファイル選択 ───────── */
  const handleSelectFile = (file: File) => {
    if (![...ALLOWED_IMG, ...ALLOWED_VIDEO].includes(file.type)) {
      alert("対応していない形式です");
      return;
    }
    if (ALLOWED_VIDEO.includes(file.type)) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(v.src);
        if (v.duration > MAX_VIDEO_SEC) {
          alert("動画は60秒以内にしてください");
          return;
        }
        setDraftFile(file);
        setPreviewURL(URL.createObjectURL(file));
      };
      v.src = URL.createObjectURL(file);
    } else {
      setDraftFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  /* ───────── 保存（アップロード & Firestore更新）───────── */
  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      // ---------- Firestore に渡すデータ ----------
      const updatePayload: {
        text: string;
        mediaUrl?: string;
        mediaType?: MediaType;
        fileName?: string;
      } = { text: draftText };

      // ---------- ファイルがある場合 ----------
      if (draftFile) {
        // 既存ファイルを削除
        if (contentMediaUrl) {
          try {
            await deleteObject(ref(getStorage(), contentMediaUrl));
          } catch {
            /* ignore */
          }
        }

        const storage = getStorage();
        const path = `${STORAGE_PATH}/${Date.now()}_${draftFile.name}`;
        const sref = ref(storage, path);

        // Cloud Functions 側のHLS変換をトリガー（mp4/mov のみ推奨）
        const isMp4OrMov =
          draftFile.type === "video/mp4" ||
          draftFile.type === "video/quicktime";

        const task = uploadBytesResumable(
          sref,
          draftFile,
          isMp4OrMov
            ? {
                contentType: draftFile.type,
                customMetadata: {
                  transcode: "hls", // ← これでCFを起動（CF側が sitePages パスを許可している必要あり）
                  siteKey: SITE_KEY,
                  page: "about",
                },
              }
            : { contentType: draftFile.type }
        );

        // UI 用 state に保持
        setUploadTask(task);
        setUploadProgress(0);

        // 進捗・完了ハンドラ
        const url: string = await new Promise((resolve, reject) => {
          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round(
                (snap.bytesTransferred / snap.totalBytes) * 100
              );
              setUploadProgress(pct);
            },
            reject,
            async () => {
              const dUrl = await getDownloadURL(task.snapshot.ref);
              resolve(dUrl);
            }
          );
        });

        updatePayload.mediaUrl = url;
        updatePayload.mediaType = ALLOWED_VIDEO.includes(draftFile.type)
          ? "video"
          : "image";
        updatePayload.fileName = draftFile.name;
      }

      // ---------- Firestore 更新 ----------
      await setDoc(docRef, updatePayload, { merge: true });

      // ---------- 画面反映 ----------
      setContentText(updatePayload.text);
      setContentMediaUrl(updatePayload.mediaUrl ?? contentMediaUrl);
      setContentMediaType(
        updatePayload.mediaUrl ? updatePayload.mediaType : contentMediaType
      );
      setEditing(false);
      setDraftFile(null);
      setPreviewURL(null);
      setKeywords(["", "", ""]);
      alert("保存しました！");
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
      setUploadProgress(null);
      setUploadTask(null);
    }
  }, [draftText, draftFile, contentMediaUrl, docRef, contentMediaType]);

  if (!gradient) return <CardSpinner />;
  if (loadingDoc) return <CardSpinner />;

  /* ───────── JSX ───────── */
  return (
    <main className="relative max-w-3xl mx-auto px-4 py-10 ">
      {/* ───── アップロード進捗 ───── */}
      {uploadProgress !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="relative z-10 w-2/3 max-w-xs bg-white/90 rounded-xl shadow-xl p-4">
            <p className="text-center text-sm font-medium text-gray-800 mb-2">
              アップロード中… {uploadProgress}%
            </p>
            <div className="w-full h-3 bg-gray-200 rounded">
              <div
                className="h-full bg-green-500 rounded transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            {uploadTask?.snapshot.state === "running" && (
              <button
                type="button"
                onClick={() => uploadTask.cancel()}
                className="block mx-auto mt-3 text-xs text-red-600 hover:underline"
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/30 bg-white/30 backdrop-blur-md shadow-lg overflow-hidden"
      >
        {contentMediaUrl && (
          <div className="relative w-full pt-[100%] bg-black/20 overflow-hidden">
            {/* スピナー */}
            {!mediaLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <CardSpinner />
              </div>
            )}

            {contentMediaType === "image" ? (
              <Image
                src={contentMediaUrl}
                alt="about-media"
                fill
                sizes="(max-width:768px) 100vw, 768px"
                className="object-cover"
                priority
                onLoad={() => setMediaLoaded(true)}
              />
            ) : (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                // HLS時は src を useEffect 内で設定（Safari以外は hls.js）
                muted
                playsInline
                autoPlay
                loop
                controls={false}
                preload="auto"
                crossOrigin="anonymous"
                // MP4直再生時は useEffect で src 設定&再生、loadedmetadata で mediaLoaded を true にします
              />
            )}
          </div>
        )}

        <div className="p-5">
          <motion.div
            key={contentText}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="leading-relaxed whitespace-pre-wrap prose prose-neutral max-w-none"
          >
            {contentText || "ただいま準備中です。"}
          </motion.div>

          {isAdmin && !editing && (
            <motion.div
              className="mt-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Button
                onClick={() => setEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 transition-colors shadow"
              >
                編集する
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ───── 編集モーダル ───── */}
      <AnimatePresence>
        {isAdmin && editing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              aria-hidden
              onClick={() => setEditing(false)}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative w-full max-w-2xl mx-4 rounded-2xl bg-white/30 shadow-2xl backdrop-blur-lg p-6 space-y-6"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              {/* テキスト編集 */}
              <div className="space-y-2">
                <Textarea
                  rows={12}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  className="min-h-40 bg-white/30 border-gray-200 text-black placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  placeholder="ここに文章を入力..."
                />
                <div className="text-right text-xs text-gray-500">
                  文字数：{draftText.length.toLocaleString()}
                </div>
              </div>

              {/* メディア選択 */}
              <section className="space-y-2">
               
                {/* メディア選択（ボタン風） */}
                <div className="space-y-2">
                  <label className="font-medium">画像 / 動画 (60秒以内)</label>

                  {/* 既存のファイル名表示（任意で残す） */}
                  {contentFileName && !previewURL && (
                    <p className="text-xs ">
                      現在のファイル:{" "}
                      <span className="font-mono">{contentFileName}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                    >
                      {draftFile ? "別のファイルを選ぶ" : "画像/動画を選択"}
                    </Button>

                    {/* 選択中ファイル名を横に表示（任意） */}
                    {(draftFile || previewURL) && (
                      <span className="text-xs text-gray-600 truncate max-w-[12rem]">
                        {draftFile?.name}
                      </span>
                    )}
                  </div>

                  {/* 本体の input は隠す */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={[...ALLOWED_IMG, ...ALLOWED_VIDEO].join(",")}
                    onChange={(e) =>
                      e.target.files?.[0] && handleSelectFile(e.target.files[0])
                    }
                    className="hidden"
                  />
                </div>

                {/* ==== プレビュー表示 ==== */}
                {/* {previewURL ? (
                  <div className="relative aspect-video w-full bg-black/10 mt-2 rounded-lg overflow-hidden">
                    {draftFile && ALLOWED_VIDEO.includes(draftFile.type) ? (
                      <video
                        src={previewURL}
                        className="absolute inset-0 w-full h-full object-cover"
                        muted
                        controls
                      />
                    ) : (
                      <Image
                        src={previewURL}
                        alt="preview"
                        fill
                        sizes="(max-width:768px) 100vw, 768px"
                        className="object-cover"
                      />
                    )}
                  </div>
                ) : contentMediaUrl ? (
                  <div className="aspect-video w-full bg-black/10 mt-2 rounded-lg overflow-hidden">
                    {contentMediaType === "video" ? (
                      <video
                        src={contentMediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        controls
                      />
                    ) : (
                      <div className="relative w-full h-[300px]">
                        <Image
                          src={contentMediaUrl}
                          alt="current-media"
                          className="object-cover"
                          fill
                        />
                      </div>
                    )}
                  </div>
                ) : null} */}

                {/* ==== メディア削除ボタン ==== */}
                {contentMediaUrl && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      try {
                        await deleteObject(ref(getStorage(), contentMediaUrl));
                        await updateDoc(docRef, {
                          mediaUrl: "",
                          mediaType: "",
                        });
                        setContentMediaUrl(undefined);
                        setContentMediaType(undefined);
                        setContentFileName(undefined);
                        setDraftFile(null);
                        setPreviewURL(null);
                      } catch {
                        alert("削除に失敗しました");
                      }
                    }}
                  >
                    メディアを削除
                  </Button>
                )}
              </section>

              {/* アクション（縦並び） */}
              <div className="flex flex-col gap-2">
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setShowAIModal(true)}
                >
                  AIで作成
                </Button>

                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "保存中…" : "保存"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setDraftFile(null);
                    setPreviewURL(null);
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── AI生成モーダル ───── */}
      <AnimatePresence>
        {showAIModal && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60"
              aria-hidden
              onClick={() => setShowAIModal(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-2xl space-y-4"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <h2 className="text-xl font-bold text-center">AIで文章を生成</h2>
              <p className="text-sm text-gray-500 text-center">
                ・最低1個以上のキーワードを入力してください
              </p>
              <div className="flex flex-col gap-2">
                {keywords.map((w, i) => (
                  <input
                    key={i}
                    type="text"
                    className="border p-2 rounded text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder={`キーワード${i + 1}`}
                    value={w}
                    onChange={(e) => {
                      const next = [...keywords];
                      next[i] = e.target.value;
                      setKeywords(next);
                    }}
                  />
                ))}
              </div>
              <div className="min-h-6 text-xs text-gray-500">
                {nonEmptyKeywords.length > 0 && (
                  <span>
                    送信キーワード：
                    <span className="font-medium">
                      {nonEmptyKeywords.join(" ／ ")}
                    </span>
                  </span>
                )}
              </div>
              <Button
                className="bg-indigo-600 w-full disabled:opacity-50 hover:bg-indigo-700"
                disabled={nonEmptyKeywords.length === 0 || aiLoading}
                onClick={async () => {
                  setAiLoading(true);
                  try {
                    const res = await fetch("/api/generate-about", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ keywords: nonEmptyKeywords }),
                    });
                    const data = await res.json();
                    setDraftText(data.text);
                    setShowAIModal(false);
                  } catch {
                    alert("生成に失敗しました");
                  } finally {
                    setAiLoading(false);
                    setKeywords(["", "", ""]);
                  }
                }}
              >
                {aiLoading ? "生成中…" : "作成"}
              </Button>
              <Button
                className="bg-gray-200 text-gray-900 w-full hover:bg-gray-300"
                variant="outline"
                onClick={() => setShowAIModal(false)}
              >
                閉じる
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
