// src/components/ProductMedia.tsx
"use client";

import Image, { StaticImageData } from "next/image";
import clsx from "clsx";
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  MouseEvent,
} from "react";
import { useOnScreen } from "@/lib/useOnScreen";

type Src = string | StaticImageData;
type MediaType = "image" | "video";

type MediaItem = {
  src: Src;
  type: MediaType;
};

interface Props {
  /** 互換用：単枚表示の src */
  src: Src;
  /** 互換用：単枚表示の type */
  type: MediaType;
  /** スライド用：画像1〜3枚 + 動画1つまで */
  items?: MediaItem[];

  className?: string;
  autoPlay?: boolean; // 既定: true（自動スライドON/OFF用）
  loop?: boolean;     // 既定: true（動画のみで使用・ただし ended でスライド）
  muted?: boolean;    // 既定: true（動画用）
  alt?: string;
}

/** items があればそれを優先。なければ旧来の単枚 src/type を1枚目として使う */
function normalizeItems(src: Src, type: MediaType, items?: MediaItem[]) {
  if (Array.isArray(items) && items.length > 0) {
    return items.filter((m) => m && m.src);
  }
  return [{ src, type }];
}

export default function ProductMedia({
  src,
  type,
  items,
  className = "",
  autoPlay = true,
  muted = true,
  alt = "",
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // 画面に入る少し前からプリロードを始めたいので rootMargin を広めに
  const [ref, visible] = useOnScreen<HTMLDivElement>("600px");

  const slides = useMemo(
    () => normalizeItems(src, type, items),
    [src, type, items]
  );

  const total = slides.length || 1;
  const safeIndex =
    total === 0 ? 0 : ((currentIndex % total) + total) % total;
  const active = slides[safeIndex] ?? slides[0];

  const activeKey =
    typeof active?.src === "string"
      ? active.src
      : (active?.src as StaticImageData | undefined)?.src ?? "";

  // 動画が1枚だけのケースではループ再生させる
  const isSingleVideo = total === 1 && active.type === "video";

  /* =======================
     VIDEO 用 ref & 再生制御
  ======================= */
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 可視範囲に入ったら動画を再生／外れたら停止
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (visible && active.type === "video") {
      const p = v.play();
      // モバイルの自動再生制限などで reject されても握りつぶす
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
    }
  }, [visible, active.type]);

  /* =======================
     自動スライド
     👉 動画がアクティブなときは動かさない
  ======================= */
  const isVideoSlide = active.type === "video";

  useEffect(() => {
    if (!autoPlay) return;
    if (total <= 1) return;
    if (isVideoSlide) return; // 動画スライド中は自動スライドしない

    const id = window.setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        return total <= 0 ? 0 : next >= total ? 0 : next;
      });
    }, 3500); // 3.5秒ごとにスライド

    return () => {
      window.clearInterval(id);
    };
  }, [autoPlay, total, isVideoSlide]);

  /* =======================
     ナビゲーション
  ======================= */
  const goTo = (idx: number) => {
    if (total <= 1) return;
    const next = ((idx % total) + total) % total;
    setCurrentIndex(next);
  };

  const handlePrev = (e: MouseEvent) => {
    e.stopPropagation();
    goTo(currentIndex - 1);
  };

  const handleNext = (e: MouseEvent) => {
    e.stopPropagation();
    goTo(currentIndex + 1);
  };

  const handleDotClick = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    goTo(idx);
  };

  // 動画再生が終わったら、ループせずに次のスライドへ
  const handleVideoEnded = () => {
    if (!autoPlay) return;
    if (total <= 1) return;
    goTo(currentIndex + 1);
  };

  /* =======================
     VIDEO 表示
  ======================= */
  if (active.type === "video") {
    const videoSrc =
      typeof active.src === "string"
        ? active.src
        : (active.src as StaticImageData).src;

    return (
      <div
        ref={ref}
        className={clsx(
          "relative w-full aspect-square overflow-hidden",
          className
        )}
      >
        <video
          key={activeKey}
          ref={videoRef}
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted={muted}
          autoPlay={autoPlay}
          // 動画1枚だけのときはループ、それ以外はループしない
          loop={isSingleVideo}
          preload={visible ? "auto" : "metadata"}
          onEnded={handleVideoEnded}
        />

        {/* スライドナビ */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/40 text-white w-8 h-8 flex items-center justify-center text-lg"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/40 text-white w-8 h-8 flex items-center justify-center text-lg"
            >
              ›
            </button>
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => handleDotClick(e, i)}
                  className={clsx(
                    "w-2 h-2 rounded-full transition-opacity",
                    i === currentIndex
                      ? "bg-white"
                      : "bg-white/50 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  /* =======================
     IMAGE 表示
     👉 インジケーター（スピナー）なしでシンプルに表示
  ======================= */
  return (
    <div
      ref={ref}
      className={clsx(
        "relative w-full aspect-square overflow-hidden",
        className
      )}
    >
      <Image
        key={activeKey}
        src={active.src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(min-width:1024px) 320px, (min-width:640px) 45vw, 90vw"
        priority={false}
        unoptimized
      />

      {/* スライドナビ（画像用） */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/40 text-white w-8 h-8 flex items-center justify-center text-lg"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/40 text-white w-8 h-8 flex items-center justify-center text-lg"
          >
            ›
          </button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => handleDotClick(e, i)}
                className={clsx(
                  "w-2 h-2 rounded-full transition-opacity",
                  i === currentIndex
                    ? "bg-white"
                    : "bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
