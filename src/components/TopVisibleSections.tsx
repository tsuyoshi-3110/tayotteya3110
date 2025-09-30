"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore"; // 👈 authも使う
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

// 各表示セクションのインポート
import ProductsClient from "./ProductsClient";
import StaffClient from "./StaffClient";
import AreasClient from "./AreasClient";
import StoresClient from "./StoresClient";
import AboutClient from "./AboutClient";
import MenuPageClient from "./MenuPageClient";
import NewsClient from "./NewsClient";

const META_REF = doc(db, "siteSettingsEditable", SITE_KEY);

// トップ表示対象に限定
const MENU_ITEMS: { key: string; label: string }[] = [
  { key: "products", label: "施工実績" },
  { key: "pricing", label: "メニュー" },
  { key: "staffs", label: "スタッフ" },
  { key: "areas", label: "対応エリア" },
  { key: "stores", label: "店舗一覧" },
  { key: "story", label: "私たちの思い" },
  { key: "news", label: "お知らせ" },
];

// key に応じてどのコンポーネントを表示するか
function renderSection(key: string) {
  switch (key) {
    case "products":
      return <ProductsClient />;
    case "pricing":
      return <MenuPageClient />;
    case "staffs":
      return <StaffClient />;
    case "areas":
      return <AreasClient />;
    case "stores":
      return <StoresClient />;
    case "story":
      return <AboutClient />;
       case "news":
      return <NewsClient />
    default:
      return null;
  }
}

export default function TopVisibleSections() {
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /* Firestoreから表示設定をロード */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(META_REF);
        if (!snap.exists()) return;
        const data = snap.data() as { activeMenuKeys?: string[] };
        if (Array.isArray(data.activeMenuKeys)) {
          setActiveKeys(data.activeMenuKeys);
        }
      } catch (e) {
        console.error("トップ表示データ取得失敗:", e);
      }
    })();
  }, []);

  /* ログイン状態を監視 */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsub();
  }, []);

  if (isLoggedIn) {
    return (
      <div className="py-8 text-center text-gray-500">
        ログアウト時に選択したページは表示されます
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {MENU_ITEMS.filter((item) => activeKeys.includes(item.key)).map(
        (item) => (
          <section key={item.key}>{renderSection(item.key)}</section>
        )
      )}
    </div>
  );
}
