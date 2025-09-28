"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { LANGS } from "@/lib/langs";
import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";
import { db } from "@/lib/firebase";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { doc, onSnapshot } from "firebase/firestore";

type LangOption = { key: UILang; label: string; emoji: string };
const ALL_OPTIONS: ReadonlyArray<LangOption> = LANGS as ReadonlyArray<LangOption>;

// Firestore: サイト設定参照
const META_REF = doc(db, "siteSettingsEditable", SITE_KEY);

const TAP_MOVE_THRESHOLD = 8;   // px 未満ならタップ
const TAP_TIME_THRESHOLD = 500; // ms 未満ならタップ

// ★ 幅をここで一括管理（お好みで 200〜260 に調整）
const PICKER_W = 220; // px

export default function UILangFloatingPicker() {
  const { uiLang, setUiLang } = useUILang();

  // Firestore からの許可言語 / i18n 有効フラグ
  const [i18nEnabled, setI18nEnabled] = useState<boolean>(true);
  const [allowedLangs, setAllowedLangs] = useState<UILang[] | null>(null); // null は未ロード

  // ▼ UI
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ▼ 自動配置（上/下）と、その時の最大高さ（px）
  const [placement, setPlacement] = useState<"down" | "up">("down");
  const [menuMaxH, setMenuMaxH] = useState<string>("60vh"); // フォールバック

  // ─────────────────────────────────────────────
  // Firestore 購読：選択言語のみ表示するための設定を取得
  // ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(META_REF, (snap) => {
      const data = snap.data() as
        | { i18n?: { enabled?: boolean; langs?: UILang[] } }
        | undefined;

      const enabled =
        typeof data?.i18n?.enabled === "boolean" ? data!.i18n!.enabled! : true;
      setI18nEnabled(enabled);

      const langs = Array.isArray(data?.i18n?.langs)
        ? (data!.i18n!.langs as UILang[])
        : (["ja"] as UILang[]); // 未設定なら日本語のみ
      // 日本語は常に含める
      const set = new Set<UILang>(langs);
      set.add("ja" as UILang);
      setAllowedLangs(Array.from(set));
    });

    return () => unsub();
  }, []);

  // ─────────────────────────────────────────────
  // 表示する言語オプションを絞り込み（i18n OFF の時は日本語のみ）
  // ─────────────────────────────────────────────
  const visibleOptions = useMemo<LangOption[]>(() => {
    // 未ロード時は安全側で日本語のみ（ちらつき防止）
    const allow = new Set<UILang>(
      i18nEnabled
        ? (allowedLangs ?? (["ja"] as UILang[]))
        : (["ja"] as UILang[])
    );
    return ALL_OPTIONS.filter((o) => allow.has(o.key));
  }, [allowedLangs, i18nEnabled]);

  // 許可外の uiLang を選んでいる場合のフォールバック
  useEffect(() => {
    if (!visibleOptions.length) return; // まれに 0 の瞬間を無視
    const isAllowed = visibleOptions.some((o) => o.key === uiLang);
    if (!isAllowed) {
      const fallback = visibleOptions.find((o) => o.key === "ja") ?? visibleOptions[0];
      setUiLang(fallback.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleOptions.map((o) => o.key).join(","), uiLang]);

  const current = useMemo<LangOption>(() => {
    // 現在言語がリストに無い場合もフォールバック
    return (
      visibleOptions.find((o) => o.key === uiLang) ??
      visibleOptions.find((o) => o.key === "ja") ??
      visibleOptions[0] ??
      ALL_OPTIONS[0]
    );
  }, [uiLang, visibleOptions]);

  const decidePlacementAndSize = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const gutter = 6;
    const vh = window.innerHeight;
    const spaceAbove = Math.max(0, rect.top - gutter);
    const spaceBelow = Math.max(0, vh - rect.bottom - gutter);
    const nextPlacement: "down" | "up" = spaceBelow >= spaceAbove ? "down" : "up";

    const capacity = nextPlacement === "down" ? spaceBelow : spaceAbove;
    const logicalMax = Math.floor(vh * 0.6); // 60vh
    const px = Math.max(Math.min(capacity, logicalMax), 160);
    setPlacement(nextPlacement);
    setMenuMaxH(`${px}px`);
  };

  // 外側タップで閉じる
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [open]);

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 開いた時 & リサイズ/スクロール時に配置を再計算
  useEffect(() => {
    if (!open) return;
    decidePlacementAndSize();
    const onResizeOrScroll = () => decidePlacementAndSize();
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll);
    };
  }, [open]);

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="pointer-events-auto mx-auto w-auto flex justify-center">
      <div
        className={clsx(
          "relative inline-flex items-center",
          "rounded-xl border bg-transparent backdrop-blur shadow-lg",
          "text-white"
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* トリガーボタン（幅固定） */}
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          className={clsx(
            "flex items-center gap-2",
            "rounded-lg border bg-transparent",
            "px-3 py-2",
            "text-[16px]",
            "min-h-[44px]",
            "cursor-pointer select-none"
          )}
          style={{ width: PICKER_W }} // ★ 幅を固定
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="表示言語を選択"
        >
          <span className="text-lg leading-none">{current.emoji}</span>
          <span className="text-sm truncate text-white">
            {current.label} / {current.key}
          </span>
          <span className="ml-auto text-white/70">▾</span>
        </button>

        {/* メニュー（幅もボタンに合わせて固定） */}
        {open && (
          <div
            ref={menuRef}
            role="listbox"
            className={clsx(
              "absolute left-1/2 -translate-x-1/2",
              placement === "down"
                ? "top-[calc(100%+6px)]"
                : "bottom-[calc(100%+6px)]",
              "z-[9999]",
              "overflow-auto rounded-xl border",
              "bg-white text-gray-900 shadow-xl"
            )}
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              touchAction: "pan-y",
              maxHeight: menuMaxH,
              width: PICKER_W, // ★ 幅を固定（ボタンと同じ）
              maxWidth: "92vw", // 画面が狭いときは縮む
            }}
          >
            {visibleOptions.map((o) => (
              <LangRow
                key={o.key}
                option={o}
                active={o.key === uiLang}
                onSelect={(val) => {
                  setUiLang(val);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** スクロールとタップを判別して、タップ時のみ onSelect を呼ぶ行 */
function LangRow({
  option,
  active,
  onSelect,
}: {
  option: LangOption;
  active: boolean;
  onSelect: (val: UILang) => void;
}) {
  const touchStart = useRef<{ y: number; x: number; t: number } | null>(null);

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onSelect(option.key)}
      onTouchStart={(e) => {
        const t = e.changedTouches[0];
        touchStart.current = { y: t.clientY, x: t.clientX, t: Date.now() };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        if (!start) return;
        const t = e.changedTouches[0];
        const dy = Math.abs(t.clientY - start.y);
        const dx = Math.abs(t.clientX - start.x);
        const dt = Date.now() - start.t;
        const isTap =
          dy < TAP_MOVE_THRESHOLD &&
          dx < TAP_MOVE_THRESHOLD &&
          dt < TAP_TIME_THRESHOLD;
        if (isTap) {
          e.preventDefault();
          onSelect(option.key);
        }
        touchStart.current = null;
      }}
      className={clsx(
        "w-full text-left px-4 py-3 text-[16px]",
        "hover:bg-gray-100 active:bg-gray-200",
        active && "bg-gray-100"
      )}
      style={{ touchAction: "pan-y" }}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0">{option.emoji}</span>
        <span className="truncate">
          {option.label} / {option.key}
        </span>
      </div>
    </button>
  );
}
