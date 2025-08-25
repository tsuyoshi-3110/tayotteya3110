"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  logPageView,
  logStayTime,
  logHourlyAccess,
  logDailyAccess,
  logReferrer,
  logWeekdayAccess,
  logVisitorType,
  logBounce,
  logGeo,
} from "@/lib/logAnalytics";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

const STAY_MAX_SEC = 120;

export default function AnalyticsLogger() {
  const pathname = usePathname() || "/";

  const leftOnceRef = useRef(false);
  const bouncedOnceRef = useRef(false);

  // 時間計測・前ページ・ページ数（直帰判定）を保持
  const startTsRef = useRef<number>(Date.now());
  const prevPathRef = useRef<string>(pathname);
  const pageCountRef = useRef<number>(0);

  // セッション/サイト単位の一度きりフラグキー
  const GEO_KEY = `geoLogged:${SITE_KEY}`;
  const REF_KEY = `refLogged:${SITE_KEY}`;
  const VT_KEY = `vt:${SITE_KEY}`;

  /** ───────── 地域（IP）ログ：セッション中1回 ───────── */
  useEffect(() => {
    try {
      if (sessionStorage.getItem(GEO_KEY)) return;
      sessionStorage.setItem(GEO_KEY, "1");

      // 無料の ipapi.co を例示
      fetch("https://ipapi.co/json")
        .then((res) => res.json())
        .then((data) => {
          const region = data?.region || data?.country_name || "Unknown";
          logGeo(SITE_KEY, region);
        })
        .catch((e) => console.error("地域取得失敗:", e));
    } catch {
      /* sessionStorage 不可時はスキップ */
    }
  }, [GEO_KEY]);

  /** ───────── 訪問者タイプ：セッション中1回 ───────── */
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(VT_KEY)) {
        logVisitorType(SITE_KEY);
        sessionStorage.setItem(VT_KEY, "1");
      }
    } catch {
      // 失敗しても他ログは継続
    }
  }, [VT_KEY]);

  /** ───────── 直帰判定（1ページのみで離脱） ───────── */
  useEffect(() => {
    pageCountRef.current++;

    const handleBounce = () => {
      // ★ ここで二重送信を防止
      if (bouncedOnceRef.current) return;

      if (pageCountRef.current === 1) {
        const pageId = pathname === "/" ? "home" : pathname.slice(1);
        logBounce(SITE_KEY, pageId);
      }
      bouncedOnceRef.current = true; // 以後このセッションでは送らない
    };

    window.addEventListener("pagehide", handleBounce);
    window.addEventListener("beforeunload", handleBounce);

    return () => {
      window.removeEventListener("pagehide", handleBounce);
      window.removeEventListener("beforeunload", handleBounce);
    };
  }, [pathname]);

  /** ───────── ルート変更ごとの PV/滞在時間/各種ログ ───────── */
  useEffect(() => {
    const prev = prevPathRef.current;
    const now = Date.now();

    const prevClean = prev && prev !== "/" ? prev.slice(1) : "home";
    const currClean = pathname && pathname !== "/" ? pathname.slice(1) : "home";

    // 直前ページの滞在時間（短時間のみ集計）
    const sec = Math.floor((now - startTsRef.current) / 1000);
    if (sec > 0 && sec <= STAY_MAX_SEC) {
      logStayTime(SITE_KEY, sec, prevClean);
    }

    // 現在ページの各種ログ
    logPageView(currClean, SITE_KEY);
    logHourlyAccess(SITE_KEY, currClean);
    logDailyAccess(SITE_KEY);
    logWeekdayAccess(SITE_KEY);

    // リファラーはセッション中1回だけ
    try {
      if (!sessionStorage.getItem(REF_KEY)) {
        logReferrer(SITE_KEY);
        sessionStorage.setItem(REF_KEY, "1");
      }
    } catch {
      /* noop */
    }

    // 次回比較用に更新
    prevPathRef.current = pathname;
    startTsRef.current = now;
  }, [pathname, REF_KEY]);

  /** ───────── 離脱時の最終滞在時間送信 ───────── */
  useEffect(() => {
    const handleLeave = () => {
      // ★ ここで二重送信を防止
      if (leftOnceRef.current) return;

      const clean = pathname && pathname !== "/" ? pathname.slice(1) : "home";
      const sec = Math.floor((Date.now() - startTsRef.current) / 1000);
      if (sec > 0 && sec <= STAY_MAX_SEC) {
        logStayTime(SITE_KEY, sec, clean);
      }
      leftOnceRef.current = true; // pagehide と beforeunload の重複対策
    };

    window.addEventListener("pagehide", handleLeave);
    window.addEventListener("beforeunload", handleLeave);

    return () => {
      window.removeEventListener("pagehide", handleLeave);
      window.removeEventListener("beforeunload", handleLeave);
    };
  }, [pathname]);

  return null;
}
