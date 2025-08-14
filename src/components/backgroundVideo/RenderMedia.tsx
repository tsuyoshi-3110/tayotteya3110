"use client";

import React from "react";
import NextImage from "next/image";
import Slideshow from "../Slideshow";
import CardSpinner from "../CardSpinner"; // ← 使っている場所に合わせてパス調整

type MediaType = "video" | "image";

type RenderMediaProps = {
  poster?: string | null;
  setReady: (ready: boolean) => void;
  type: MediaType;
  url?: string | null;
  imageUrls?: string[];
  isPortrait: boolean | null;
  setIsPortrait: (value: boolean) => void;
};

/* ----------------------------- 共通: ミュートボタン ----------------------------- */
function MuteButton({
  muted,
  toggle,
  className = "",
}: {
  muted: boolean;
  toggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      aria-label={muted ? "音をオンにする" : "音をオフにする"}
      className={
        "absolute top-3 left-3 z-20 rounded-full bg-black/60 text-white backdrop-blur px-3 py-2 text-xs font-medium hover:bg-black/70 active:scale-95 transition " +
        className
      }
    >
      {muted ? "🔇 オン" : "🔊 オフ"}
    </button>
  );
}

/* ----------------------------- 音声有無の判定ユーティリティ ----------------------------- */
function detectHasAudio(video: HTMLVideoElement): boolean | null {
  const v = video as any;

  // 1) Safari 等: audioTracks API
  if (typeof v.audioTracks !== "undefined" && v.audioTracks) {
    try {
      return v.audioTracks.length > 0;
    } catch {}
  }
  // 2) Firefox
  if (typeof v.mozHasAudio !== "undefined") {
    try {
      return !!v.mozHasAudio;
    } catch {}
  }
  // 3) WebKit系の旧API（再生が進むと >0 になることが多い）
  if (typeof v.webkitAudioDecodedByteCount !== "undefined") {
    try {
      return v.webkitAudioDecodedByteCount > 0;
    } catch {}
  }
  // 4) 可能なら captureStream のオーディオトラックを見る
  try {
    const stream = (video as any).captureStream?.();
    if (stream) {
      const tracks = stream.getAudioTracks?.();
      if (Array.isArray(tracks)) return tracks.length > 0;
    }
  } catch {}
  // 判定できない
  return null;
}

/* ----------------------------- HLSプレイヤー (.m3u8) ----------------------------- */
/** Safari はネイティブ / その他は hls.js。最初ミュート、再生可能までスピナー。音声が無い場合はボタン非表示。 */
function HlsPlayer({
  src,
  poster,
  onReady,
  onSetPortrait,
  objectFitClass,
}: {
  src: string;
  poster?: string | null;
  onReady: () => void;
  onSetPortrait: (portrait: boolean) => void;
  objectFitClass: string;
}) {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  const hlsRef = React.useRef<any | null>(null);
  const [muted, setMuted] = React.useState(true);
  const [isReady, setIsReady] = React.useState(false);
  const [hasAudio, setHasAudio] = React.useState<boolean | null>(null); // ← これで表示制御

  const prime = (v: HTMLVideoElement) => {
    v.playsInline = true;                      // prop
    v.muted = muted;                           // prop
    v.setAttribute("playsinline", "");         // attr
    v.setAttribute("webkit-playsinline", "");  // attr
    if (muted) v.setAttribute("muted", ""); else v.removeAttribute("muted");
  };

  const safePlay = (v: HTMLVideoElement) => {
    v.play().catch(() => {
      const onVisible = () => {
        if (document.visibilityState === "visible") {
          v.play().catch(() => {});
          document.removeEventListener("visibilitychange", onVisible);
        }
      };
      setTimeout(() => v.play().catch(() => {}), 300);
      document.addEventListener("visibilitychange", onVisible);
    });
  };

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;

    let cancelled = false;

    const onLoadedMeta = () => {
      onSetPortrait(video.videoWidth < video.videoHeight);
      // メタ読み込み時点で音声の有無を推定
      const guess = detectHasAudio(video);
      if (guess !== null) setHasAudio(guess);
    };
    const onCanPlay = () => {
      setIsReady(true);
      onReady();
      // 再生可能時にも念のため再チェック
      const guess = detectHasAudio(video);
      if (guess !== null) setHasAudio(guess);
    };
    const onPlaying = () => {
      setIsReady(true);
      onReady();
      const guess = detectHasAudio(video);
      if (guess !== null) setHasAudio(guess);
    };

    // 旧インスタンス掃除
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
    try { video.pause(); } catch {}
    video.removeAttribute("src");
    video.load();

    prime(video);

    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("playing", onPlaying, { once: true });

    // Safari: ネイティブ HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.load();
      safePlay(video);
    } else {
      (async () => {
        const HlsMod = await import("hls.js");
        if (cancelled) return;
        const Hls = HlsMod.default;
        if (Hls.isSupported()) {
          const hls = new Hls({
            capLevelToPlayerSize: true,
            maxBufferLength: 10,
            maxMaxBufferLength: 30,
            backBufferLength: 0,
            lowLatencyMode: false,
            enableWorker: true,
          });
          hlsRef.current = hls;

          // マニフェスト解析時に audioTracks/levels から音声の有無を推定
          hls.on(Hls.Events.MANIFEST_PARSED, (_evt: any, data: any) => {
            const has = (data?.audioTracks?.length ?? 0) > 0 ||
                        (Array.isArray(data?.levels) && data.levels.some((l: any) => !!l?.audioCodec));
            setHasAudio(has);
          });

          hls.attachMedia(video);
          hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
          hls.on(Hls.Events.LEVEL_LOADED, () => safePlay(video));
        } else {
          // フォールバック
          video.src = src;
          video.load();
          safePlay(video);
        }
      })();
    }

    return () => {
      cancelled = true;
      try {
        video.removeEventListener("loadedmetadata", onLoadedMeta);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("playing", onPlaying);
      } catch {}
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
      try { video.pause(); } catch {}
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, muted]);

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    const next = !muted;
    setMuted(next);
    v.muted = next;
    if (next) v.setAttribute("muted", "");
    else v.removeAttribute("muted");
    if (!next) v.volume = 1;
    v.play().catch(() => {});
  };

  return (
    <div className="absolute inset-0">
      {/* Spinner overlay */}
      {!isReady && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10">
          <CardSpinner />
        </div>
      )}

      <video
        key={String(src)}
        ref={ref}
        autoPlay
        loop
        preload="auto"
        poster={poster ?? undefined}
        className={`absolute inset-0 w-full h-full ${objectFitClass}`}
        crossOrigin="anonymous"
      />
      {/* 音声が無いと分かったらボタン非表示。判定不能(null)なら一旦非表示にしてもOKだが、ここでは true のときのみ表示 */}
      {hasAudio === true && <MuteButton muted={muted} toggle={toggleMute} />}
    </div>
  );
}

/* ----------------------------- メイン: RenderMedia ----------------------------- */
export function RenderMedia({
  poster,
  setReady,
  type,
  url,
  imageUrls = [],
  isPortrait,
  setIsPortrait,
}: RenderMediaProps) {
  const objectFitClass = isPortrait ? "object-cover" : "object-contain";

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    setIsPortrait(ratio < 1);
    setReady(true);
  };

  // --- 動画 ---
  if (type === "video" && url) {
    const src = String(url);
    const isHls = src.includes(".m3u8");

    if (isHls) {
      return (
        <HlsPlayer
          key={src}
          src={src}
          poster={poster}
          onReady={() => setReady(true)}
          onSetPortrait={(p) => setIsPortrait(p)}
          objectFitClass={objectFitClass}
        />
      );
    }

    // --- MP4 等（初期ミュート & スピナー & 音声判定） ---
    const VideoMp4: React.FC = () => {
      const vref = React.useRef<HTMLVideoElement | null>(null);
      const [muted, setMuted] = React.useState(true);
      const [isReady, setIsReady] = React.useState(false);
      const [hasAudio, setHasAudio] = React.useState<boolean | null>(null);

      React.useEffect(() => {
        const v = vref.current;
        if (!v) return;

        const onLoadedMeta = () => {
          setIsPortrait(v.videoWidth < v.videoHeight);
          const guess = detectHasAudio(v);
          if (guess !== null) setHasAudio(guess);
        };
        const onCanPlay = () => {
          setIsReady(true);
          setReady(true);
          const guess = detectHasAudio(v);
          if (guess !== null) setHasAudio(guess);
        };
        const onPlaying = () => {
          setIsReady(true);
          setReady(true);
          const guess = detectHasAudio(v);
          if (guess !== null) setHasAudio(guess);
        };

        v.addEventListener("loadedmetadata", onLoadedMeta);
        v.addEventListener("canplay", onCanPlay, { once: true });
        v.addEventListener("playing", onPlaying, { once: true });

        // 初期設定（iOS対策）
        v.playsInline = true;
        v.setAttribute("playsinline", "");
        v.setAttribute("webkit-playsinline", "");
        v.muted = true;
        v.setAttribute("muted", "");
        v.play().catch(() => {});

        return () => {
          try {
            v.removeEventListener("loadedmetadata", onLoadedMeta);
            v.removeEventListener("canplay", onCanPlay);
            v.removeEventListener("playing", onPlaying);
          } catch {}
        };
      }, []);

      const toggleMute = () => {
        const v = vref.current;
        if (!v) return;
        const next = !muted;
        setMuted(next);
        v.muted = next;
        if (next) v.setAttribute("muted", "");
        else v.removeAttribute("muted");
        if (!next) v.volume = 1;
        v.play().catch(() => {});
      };

      return (
        <div className="absolute inset-0">
          {!isReady && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10">
              <CardSpinner />
            </div>
          )}
          <video
            key={src}
            ref={vref}
            autoPlay
            loop
            preload="auto"
            poster={poster ?? ""}
            className={`absolute inset-0 w-full h-full ${objectFitClass}`}
            crossOrigin="anonymous"
          >
            <source src={src} type="video/mp4" />
          </video>
          {hasAudio === true && <MuteButton muted={muted} toggle={toggleMute} />}
        </div>
      );
    };

    return <VideoMp4 key={`mp4-${src}`} />;
  }

  // --- 画像（1枚） ---
  if (type === "image" && imageUrls.length === 1) {
    return (
      <NextImage
        src={imageUrls[0]}
        alt="背景画像"
        fill
        sizes="100vw"
        priority
        className={`absolute inset-0 w-full h-full ${objectFitClass}`}
        onLoad={handleImageLoad}
      />
    );
  }

  // --- 画像（複数枚スライド） ---
  if (type === "image" && imageUrls.length > 1) {
    return <Slideshow urls={imageUrls} onFirstLoad={() => setReady(true)} />;
  }

  return null;
}
