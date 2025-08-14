"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";

import { v4 as uuid } from "uuid";
import imageCompression from "browser-image-compression";

import { useThemeGradient } from "@/lib/useThemeGradient";
import { ThemeKey, THEMES } from "@/lib/themes";
import { type Product } from "@/types/Product";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { motion } from "framer-motion";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

type MediaType = "image" | "video";

export default function ProductDetail({ product }: { product: Product }) {
  /* ---------- 権限・テーマ ---------- */
  const [isAdmin, setIsAdmin] = useState(false);
  const gradient = useThemeGradient();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setIsAdmin(!!u));
    return () => unsub();
  }, []);

  const isDark = useMemo(() => {
    const darks: ThemeKey[] = ["brandG", "brandH", "brandI"];
    return gradient && darks.some((k) => gradient === THEMES[k]);
  }, [gradient]);

  /* ---------- 表示用データ（リアルタイム購読） ---------- */
  const [displayProduct, setDisplayProduct] = useState<Product>(product);

  useEffect(() => {
    const prodRef = doc(db, "siteProducts", SITE_KEY, "items", product.id);
    const unsub = onSnapshot(prodRef, (snap) => {
      if (snap.exists()) {
        setDisplayProduct((prev) => ({ ...prev, ...(snap.data() as Product) }));
      }
    });
    return () => unsub();
  }, [product.id]);

  /* ---------- 編集モーダル用 state ---------- */
  const [showEdit, setShowEdit] = useState(false);
  const [title, setTitle] = useState(product.title);
  const [body, setBody] = useState(product.body);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const uploading = progress !== null;

  /* ---------- HLS再生（常時ミュート自動再生） ---------- */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (
      !video ||
      displayProduct.mediaType !== "video" ||
      !displayProduct.mediaURL
    )
      return;

    const url = displayProduct.mediaURL;
    const isM3U8 = /\.m3u8(\?|$)/i.test(url);

    // 既存プレイヤーの完全停止（重複音・多重再生の防止）
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

    // iOS/モバイル対策：プロパティ＆属性の両方を設定（常時ミュート）
    video.muted = true;
    video.setAttribute("muted", "");
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const safePlay = () => {
      video.play().catch(() => {
        // 稀な失敗へのフォールバック
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

    let cancelled = false;

    (async () => {
      if (isM3U8) {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, autoStartLoad: true });
          hlsRef.current = hls;
          hls.attachMedia(video);
          hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
          hls.on(Hls.Events.LEVEL_LOADED, () => safePlay());
        } else {
          // Safari はネイティブ再生
          video.src = url;
          video.addEventListener("loadedmetadata", () => safePlay(), {
            once: true,
          });
          video.load();
        }
      } else {
        // MP4/MOV 等
        video.src = url;
        video.addEventListener("loadedmetadata", () => safePlay(), {
          once: true,
        });
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
  }, [displayProduct.mediaURL, displayProduct.mediaType]);

  /* ---------- ハンドラ ---------- */
  const handleSave = async () => {
    if (!title.trim()) return alert("タイトル必須");

    try {
      let mediaURL = displayProduct.mediaURL;
      let mediaType: MediaType = displayProduct.mediaType;

      // 画像 / 動画を差し替える場合のみアップロード
      if (file) {
        const isVideo = file.type.startsWith("video/");
        mediaType = isVideo ? "video" : "image";

        const isValidImage =
          file.type === "image/jpeg" || file.type === "image/png";
        const isValidVideo =
          file.type === "video/mp4" || file.type === "video/quicktime";
        if (!isValidImage && !isValidVideo)
          return alert("対応形式：JPEG/PNG/MP4/MOV");

        // 最大 100MB
        if (isVideo && file.size > 100 * 1024 * 1024)
          return alert("動画は 100MB 未満にしてください");

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

        // Storage へアップロード（HLS 変換用メタデータ付与）
        const storage = getStorage();
        const storageRef = ref(
          storage,
          `products/public/${SITE_KEY}/${product.id}.${ext}`
        );
        const metadata = isVideo
          ? {
              contentType: file.type,
              customMetadata: {
                transcode: "hls",
                siteKey: SITE_KEY,
                productId: product.id,
              },
            }
          : { contentType: "image/jpeg" };

        const task = uploadBytesResumable(storageRef, uploadFile, metadata);

        setProgress(0);
        task.on("state_changed", (s) =>
          setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100))
        );
        await task;

        // 一旦元動画URLを保存（CF 後で m3u8 に差し替え）
        mediaURL = `${await getDownloadURL(storageRef)}?v=${uuid()}`;
        setProgress(null);
      }

      await updateDoc(doc(db, "siteProducts", SITE_KEY, "items", product.id), {
        title,
        body,
        mediaURL,
        mediaType,
        updatedAt: serverTimestamp(),
      });

      setDisplayProduct((prev) => ({
        ...prev,
        title,
        body,
        mediaURL,
        mediaType,
      }));

      setShowEdit(false);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
      setProgress(null);
    }
  };

  // 削除（元動画・画像＋HLSディレクトリの掃除）
  const handleDelete = async () => {
    if (!confirm(`「${displayProduct.title}」を削除しますか？`)) return;

    const storage = getStorage();
    const basePath = `products/public/${SITE_KEY}/${product.id}`;
    const jpgRef = ref(storage, `${basePath}.jpg`);
    const mp4Ref = ref(storage, `${basePath}.mp4`);
    const movRef = ref(storage, `${basePath}.mov`);
    const hlsDirRef = ref(
      storage,
      `products/public/${SITE_KEY}/hls/${product.id}`
    );

    await deleteDoc(doc(db, "siteProducts", SITE_KEY, "items", product.id));

    await Promise.all([
      deleteObject(jpgRef).catch(() => {}),
      deleteObject(mp4Ref).catch(() => {}),
      deleteObject(movRef).catch(() => {}),
      (async () => {
        const listing = await listAll(hlsDirRef).catch(() => null);
        if (listing) {
          await Promise.all(
            listing.items.map((i) => deleteObject(i).catch(() => {}))
          );
          await Promise.all(
            listing.prefixes.map(async (p) => {
              const sub = await listAll(p).catch(() => null);
              if (sub)
                await Promise.all(
                  sub.items.map((i) => deleteObject(i).catch(() => {}))
                );
            })
          );
        }
      })(),
    ]);

    router.back();
  };

  /* ---------- JSX ---------- */
  return (
    <main className="min-h-screen flex items-start justify-center p-4 pt-24">
      {/* カード外枠 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className={clsx(
          "border rounded-lg overflow-hidden shadow-xl relative transition-colors duration-200",
          "w-full max-w-md",
          "bg-gradient-to-b",
          "mt-5",
          gradient,
          isDark ? "bg-black/40 text-white" : "bg-white"
        )}
      >
        {/* 編集・削除 */}
        {isAdmin && (
          <div className="absolute top-2 right-2 z-20 flex gap-1">
            <button
              onClick={() => setShowEdit(true)}
              className="px-2 py-1 bg-blue-600 text-white text-md rounded shadow disabled:opacity-50"
            >
              編集
            </button>
            <button
              onClick={handleDelete}
              className="px-2 py-1 bg-red-600 text-white text-md rounded shadow disabled:opacity-50"
            >
              削除
            </button>
          </div>
        )}

        {/* メディア */}
        {displayProduct.mediaType === "image" ? (
          <div className="relative w-full aspect-square">
            <Image
              src={displayProduct.mediaURL}
              alt={displayProduct.title}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        ) : (
          <video
            key={(displayProduct.mediaURL || "").replace(/[\?#].*$/, "")}
            ref={videoRef}
            autoPlay
            muted
            playsInline
            loop
            controls={false}
            preload="auto"
            className="w-full aspect-square object-cover"
            crossOrigin="anonymous"
          />
        )}

        {/* テキスト */}
        <div className="p-4 space-y-2">
          <h1 className={clsx("text-lg font-bold", isDark && "text-white")}>
            {displayProduct.title}
          </h1>
          {displayProduct.body && (
            <p
              className={clsx(
                "text-sm whitespace-pre-wrap leading-relaxed",
                isDark && "text-white"
              )}
            >
              {displayProduct.body}
            </p>
          )}
        </div>
      </motion.div>

      {/* ---------- 編集モーダル ---------- */}
      {isAdmin && showEdit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-center">商品を編集</h2>

            <input
              type="text"
              placeholder="商品名"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border px-3 py-2 rounded"
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

            <input
              type="file"
              accept="image/*,video/mp4,video/quicktime"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="bg-gray-500 text-white w-full h-10 px-3 py-1 rounded"
              disabled={uploading}
            />

            {uploading && (
              <div className="w-full flex flex-col items-center gap-2">
                <p>アップロード中… {progress}%</p>
                <div className="w-full h-2 bg-gray-200 rounded">
                  <div
                    className="h-full bg-green-500 rounded transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={handleSave}
                disabled={uploading}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                更新
              </button>
              <button
                onClick={() => !uploading && setShowEdit(false)}
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
