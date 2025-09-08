"use client";

import { LANGS } from "@/lib/langs";
import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";
export default function UILangFloatingPicker() {
  const { uiLang, setUiLang } = useUILang();

  return (
    <div className=" pointer-events-auto mx-auto">
      <div className="rounded-xl border bg-white/50 backdrop-blur px-2 py-1 shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <label className="text-sm font-medium">表示言語</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={uiLang}
            onChange={(e) => setUiLang(e.target.value as UILang)}
            aria-label="表示言語を選択"
          >
            <option value="ja">日本語 / ja</option>
            {LANGS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label} / {l.key}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
