// lib/logAnalytics.ts
import {
  addDoc,
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { format } from "date-fns";

/* ───────── 除外ページ ───────── */
const EXCLUDE_PAGES = ["login", "analytics", "community", "postList", "cmd_sco"];

/* ───────── 公開関数 ───────── */

/** ページビュー（PV）記録：除外対象は記録しない
 *  直帰率用の分母（totalViews）もここで +1 します
 */
export const logPageView = async (path: string, siteKey: string) => {
  const pageId = normalizePageId(path);
  if (EXCLUDE_PAGES.includes(pageId)) return;

  const pageRef = doc(db, "analytics", siteKey, "pages", pageId);
  const bounceRef = doc(db, "analytics", siteKey, "bounceStats", pageId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(pageRef);
    if (snap.exists()) {
      tx.update(pageRef, {
        count: (snap.data().count || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(pageRef, {
        count: 1,
        updatedAt: serverTimestamp(),
      });
    }

    // 直帰率の分母（ページビュー総数）
    tx.set(bounceRef, { totalViews: increment(1) }, { merge: true });
  });
};

/** イベント（クリック等）記録：除外なし */
export const logEvent = async (eventName: string, siteKey: string, label?: string) => {
  const docRef = doc(db, "analytics", siteKey, "events", eventName);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (snap.exists()) {
      transaction.update(docRef, {
        count: (snap.data().count || 0) + 1,
        updatedAt: serverTimestamp(),
        label: label || null,
      });
    } else {
      transaction.set(docRef, {
        count: 1,
        updatedAt: serverTimestamp(),
        label: label || null,
      });
    }
  });
};

/** 滞在時間（秒）記録：除外対象は記録しない */
export const logStayTime = async (siteKey: string, seconds: number, pageId?: string) => {
  const cleanId = normalizePageId(pageId || "home");
  if (EXCLUDE_PAGES.includes(cleanId)) return;

  const eventDoc = `home_stay_seconds_${cleanId}`;
  const docRef = doc(db, "analytics", siteKey, "events", eventDoc);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(docRef);
    const prev = snap.exists() ? snap.data() : { totalSeconds: 0, count: 0 };
    tx.set(
      docRef,
      {
        totalSeconds: (prev.totalSeconds ?? 0) + seconds,
        count: (prev.count ?? 0) + 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
};

/** 時間帯ログ追加（ヒートマップ用） */
export async function logHourlyAccess(siteKey: string, pageId: string) {
  try {
    const hour = new Date().getHours();
    await addDoc(collection(db, "analytics", siteKey, "hourlyLogs"), {
      siteKey,
      pageId,
      accessedAt: serverTimestamp(),
      hour,
    });
  } catch (error) {
    console.error("アクセスログ保存失敗:", error);
  }
}

/** 日別アクセス数（集計用） */
export async function logDailyAccess(siteKey: string) {
  try {
    const todayId = format(new Date(), "yyyy-MM-dd");
    const dailyRef = doc(db, "analytics", siteKey, "dailyLogs", todayId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(dailyRef);
      if (snap.exists()) {
        tx.update(dailyRef, {
          count: (snap.data().count || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(dailyRef, {
          count: 1,
          updatedAt: serverTimestamp(),
          accessedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error("日別アクセスログ保存失敗:", error);
  }
}

/** リファラー（SNS/検索/直接流入など） */
export const logReferrer = async (siteKey: string) => {
  try {
    let referrer = document.referrer;
    if (!referrer) {
      referrer = "direct";
    } else {
      const url = new URL(referrer);
      referrer = url.hostname.replace(/^www\./, "");
    }
    const docRef = doc(db, "analytics", siteKey, "referrers", referrer);
    await setDoc(docRef, { count: increment(1) }, { merge: true });
  } catch (e) {
    console.error("リファラー記録エラー:", e);
  }
};

/** 曜日別アクセス数 */
export async function logWeekdayAccess(siteKey: string) {
  try {
    const dayOfWeek = new Date().getDay(); // 0:日〜6:土
    const weekdayLabels = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const weekdayId = weekdayLabels[dayOfWeek];

    const ref = doc(db, "analytics", siteKey, "weekdayLogs", weekdayId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        tx.update(ref, {
          count: (snap.data().count || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(ref, {
          count: 1,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error("曜日別アクセスログ保存失敗:", error);
  }
}

/** 新規/リピーター判定（簡易） */
export async function logVisitorType(siteKey: string) {
  try {
    const id = generateUUID();
    const ref = doc(db, "analytics", siteKey, "visitorStats", id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const isNew = !snap.exists();
      tx.set(
        ref,
        {
          new: isNew ? 1 : 0,
          returning: isNew ? 0 : 1,
          lastVisit: serverTimestamp(),
        },
        { merge: true }
      );
    });
  } catch (e) {
    console.error("visitorType 記録エラー:", e);
  }
}

/** 直帰発生時の記録：直帰数(count)のみ +1
 *  分母(totalViews)は logPageView で加算済み
 */
export async function logBounce(siteKey: string, pageId: string) {
  const cleanId = normalizePageId(pageId || "home");
  if (EXCLUDE_PAGES.includes(cleanId)) return;

  const ref = doc(db, "analytics", siteKey, "bounceStats", cleanId);
  await runTransaction(db, async (tx) => {
    tx.set(ref, { count: increment(1) }, { merge: true });
  });
}

/** 地域別アクセス */
export async function logGeo(siteKey: string, region: string) {
  try {
    const ref = doc(db, "analytics", siteKey, "geoStats", region);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        tx.update(ref, { count: increment(1) });
      } else {
        tx.set(ref, { count: 1 });
      }
    });
  } catch (e) {
    console.error("地域別アクセスログ失敗:", e);
  }
}

/* ───────── ユーティリティ ───────── */

/** ページID正規化：先頭スラッシュ除去、?/# 除去、/→_、動的prefix集約 */
function normalizePageId(path: string): string {
  const raw = path.replace(/^\/+/, "").split("?")[0].split("#")[0];
  const decoded = safeDecode(raw);
  if (decoded.startsWith("products/")) return "products";
  return decoded.replaceAll("/", "_") || "home";
}

function safeDecode(str: string) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/** UUID（ブラウザ互換を考慮） */
function generateUUID(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    return [...bytes]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
