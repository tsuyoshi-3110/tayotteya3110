"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { LANGS } from "@/lib/langs";
import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";

type LangOption = {
  key: UILang;
  label: string;
  emoji: string;
};


const ALL_OPTIONS: ReadonlyArray<LangOption> = LANGS;

const TAP_MOVE_THRESHOLD = 8;   // px 未満ならタップ
const TAP_TIME_THRESHOLD = 500; // ms 未満ならタップ

export default function UILangFloatingPicker() {
  const { uiLang, setUiLang } = useUILang();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const current = useMemo<LangOption>(() => {
    return ALL_OPTIONS.find((o) => o.key === uiLang) ?? ALL_OPTIONS[0];
  }, [uiLang]);

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

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="pointer-events-auto mx-auto w-full flex justify-center">
      <div
        className={clsx(
          "relative inline-flex items-center",
          "rounded-xl border bg-transparent backdrop-blur shadow-lg"
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* トリガーボタン */}
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          className={clsx(
            "flex items-center gap-2",
            "rounded-lg border bg-transparent",
            "px-3 py-2",
            "text-[16px]",             // iOS ズーム抑止
            "min-h-[44px] min-w-[200px]",
            "cursor-pointer select-none"
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="表示言語を選択"
        >
          <span className="text-lg leading-none">{current.emoji}</span>
          <span className="text-sm text-gray-900 truncate">
            {current.label} / {current.key}
          </span>
          <span className="ml-auto text-gray-500">▾</span>
        </button>

        {/* メニュー */}
        {open && (
          <div
            ref={menuRef}
            role="listbox"
            className={clsx(
              "absolute left-1/2 top-[calc(100%+6px)] -translate-x-1/2",
              "z-[9999]",
              "w-[min(92vw,420px)] max-h-[60vh] overflow-auto rounded-xl border bg-white shadow-xl"
            )}
            // スクロールの誤作動抑止
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              touchAction: "pan-y", // 垂直スクロールのみ許可
            }}
          >
            {ALL_OPTIONS.map((o) => (
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
      // マウスは通常クリック
      onClick={() => onSelect(option.key)}
      // タッチは移動・時間で“タップ”判定
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

        // スクロール（移動が大きい/時間が長い）は選択しない
        if (isTap) {
          e.preventDefault(); // 300ms 後の click 抑止
          onSelect(option.key);
        }
        touchStart.current = null;
      }}
      className={clsx(
        "w-full text-left px-4 py-3 text-[16px]",
        "hover:bg-gray-100 active:bg-gray-200",
        active && "bg-gray-100"
      )}
      // iOS の誤爆抑止（横パンは無効）
      style={{ touchAction: "pan-y" }}
    >
      <span className="mr-2">{option.emoji}</span>
      {option.label} / {option.key}
    </button>
  );
}
