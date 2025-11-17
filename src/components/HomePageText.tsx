// src/components/HomePageText.tsx
"use client";

import { copy, site } from "@/config/site";
import { useUILang } from "@/lib/atoms/uiLangAtom";

export default function HomePageText() {
  const { uiLang } = useUILang();

  // copy は Record<string, CopyBundle> になったのでこう取る
  const bundle = copy[uiLang] ?? copy["ja"];

  const headline = bundle.home.headline || site.name;
  const description = bundle.home.description || "";

  return (
    <>
      <h1 className="text-3xl lg:text-4xl font-extrabold text-center leading-tight mb-6 text-outline">
        {headline}
      </h1>
      {description && (
        <p className="max-w-3xl mx-auto text-center leading-relaxed text-outline">
          {description}
        </p>
      )}
    </>
  );
}
