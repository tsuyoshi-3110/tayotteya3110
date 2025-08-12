"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import Link from "next/link";
import { useSetAtom } from "jotai";
import { partnerSiteKeyAtom } from "@/lib/atoms/siteKeyAtom";
import { Inbox } from "lucide-react";
import clsx from "clsx";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { ThemeKey, THEMES } from "@/lib/themes";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

/* ---------- 型 ---------- */
type SiteOwner = {
  id: string; // siteKey
  siteName: string;
  ownerName: string;
  ownerAddress: string;
  iconUrl: string;
  ownerId: string;
};

/* ---------- 定数 ---------- */

const DARK_KEYS: ThemeKey[] = ["brandG", "brandH", "brandI"];
const collatorJa = new Intl.Collator("ja", { sensitivity: "base" });

/* ----------  Component ---------- */
export default function CommunityPage() {
  /* ステート */
  const [owners, setOwners] = useState<SiteOwner[]>([]);
  const [query, setQuery] = useState(""); // 🔍 検索クエリ
  const gradient = useThemeGradient();
  const setPartnerSiteKey = useSetAtom(partnerSiteKeyAtom);

  /* ダーク判定 */
  const isDark = useMemo(
    () => !!gradient && DARK_KEYS.some((k) => gradient === THEMES[k]),
    [gradient]
  );

  /* ───────── 店舗一覧取得 & 五十音ソート ───────── */
  useEffect(() => {
    const fetchOwners = async () => {
      const snap = await getDocs(collection(db, "siteSettings"));
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const siteKey = d.id;
          const editableSnap = await getDoc(
            doc(db, "siteSettingsEditable", siteKey)
          );
          const editableData = editableSnap.exists() ? editableSnap.data() : {};

          return {
            id: siteKey,
            siteName: data.siteName ?? "(無名の店舗)",
            ownerName: data.ownerName ?? "(名前未設定)",
            ownerAddress: data.ownerAddress ?? "(住所不明)",
            ownerId: data.ownerId ?? "",
            iconUrl: editableData.headerLogoUrl ?? "/noImage.png",
          } as SiteOwner;
        })
      );

      /* ❶ 自分を除外 → ❷ siteName 五十音順に並べ替え */
      const sorted = rows
        .filter((r) => r.id !== SITE_KEY)
        .sort((a, b) => collatorJa.compare(a.siteName, b.siteName));

      setOwners(sorted);
    };

    fetchOwners();
  }, []);

  /* ───────── 検索フィルタリング ───────── */
  const filteredOwners = useMemo(() => {
    if (!query.trim()) return owners;
    const q = query.trim().toLowerCase();
    return owners.filter((o) => o.siteName.toLowerCase().includes(q));
  }, [owners, query]);

  /* 入力ハンドラをメモ化 */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
    []
  );

  /* ----------  UI ---------- */
  return (
    <main className="mx-auto max-w-3xl p-4 pt-20">
      {/* 🔍 検索ボックス */}
      <input
        type="text"
        placeholder="店舗名で検索…"
        value={query}
        onChange={handleChange}
        className={clsx(
          "mb-4 w-full rounded border px-3 py-2 text-sm focus:outline-none",
          isDark ? "text-white placeholder-gray-300 border-gray-600" : ""
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filteredOwners.map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-4 rounded-lg border p-4 shadow transition hover:shadow-md"
          >
            <Image
              src={o.iconUrl}
              alt={o.ownerName}
              width={60}
              height={60}
              className="rounded-full object-cover"
            />

            <div className="flex-1">
              <p
                className={clsx(
                  "font-bold",
                  isDark ? "text-white" : "text-black"
                )}
              >
                {o.siteName}
              </p>
              <p
                className={clsx(
                  "text-sm",
                  isDark ? "text-gray-200" : "text-gray-600"
                )}
              >
                {o.ownerAddress}
              </p>
              <p
                className={clsx(
                  "text-sm",
                  isDark ? "text-gray-300" : "text-gray-500"
                )}
              >
                by&nbsp;{o.ownerName}
              </p>
            </div>

            <Link
              href={`/community/message/${o.id}`}
              onClick={() => setPartnerSiteKey(o.id)}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              メッセージ
            </Link>
          </div>
        ))}
      </div>

      {/* 受信箱ボタン */}
      <Link
        href="/community/message/inbox"
        aria-label="受信箱"
        className="fixed bottom-4 left-10 z-40 flex h-12 w-12 items-center justify-center rounded-full
                   bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus:outline-none"
      >
        <Inbox className="h-6 w-6" />
      </Link>
    </main>
  );
}
