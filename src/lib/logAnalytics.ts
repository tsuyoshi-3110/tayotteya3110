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
const EXCLUDE_PAGES = [
  "login",
  "analytics",
  "community",
  "postList",
  "cmd_sco",
];

/* ───────── 公開関数 ───────── */

/** ページビュー（PV）記録：除外対象は記録しない
 *  直帰率用の分母（totalViews）もここで +1 します
 */
export const logPageView = async (path: string, siteKey: string) => {
  const pageId = normalizePageId(path);
  if (EXCLUDE_PAGES.includes(pageId)) return;

  const pageRef = doc(db, "analytics", siteKey, "pages", pageId);
  const bounceRef = doc(db, "analytics", siteKey, "bounceStats", pageId);
  const dateId = format(new Date(), "yyyy-MM-dd");
  const bounceDailyRef = doc(
    db,
    "analytics",
    siteKey,
    "bounceDaily",
    `${dateId}_${pageId}`
  );

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(pageRef);
    if (snap.exists()) {
      tx.update(pageRef, {
        count: (snap.data().count || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(pageRef, { count: 1, updatedAt: serverTimestamp() });
    }
    tx.set(bounceRef, { totalViews: increment(1) }, { merge: true }); // 累計
    tx.set(
      bounceDailyRef,
      { date: dateId, pageId, totalViews: increment(1) },
      { merge: true }
    ); // ★ 日別
  });
};

/** 直帰発生時の記録：直帰数(count)のみ +1
 *  分母(totalViews)は logPageView で加算済み
 */
export async function logBounce(siteKey: string, pageId: string) {
  const cleanId = normalizePageId(pageId || "home");
  if (EXCLUDE_PAGES.includes(cleanId)) return;

  const dateId = format(new Date(), "yyyy-MM-dd");
  const ref = doc(db, "analytics", siteKey, "bounceStats", cleanId);
  const dailyRef = doc(
    db,
    "analytics",
    siteKey,
    "bounceDaily",
    `${dateId}_${cleanId}`
  );

  await runTransaction(db, async (tx) => {
    tx.set(ref, { count: increment(1) }, { merge: true }); // 累計
    tx.set(
      dailyRef,
      { date: dateId, pageId: cleanId, count: increment(1) },
      { merge: true }
    ); // ★ 日別
  });
}

/** イベント（クリック等）記録：除外なし */
export const logEvent = async (
  eventName: string,
  siteKey: string,
  label?: string
) => {
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
/** 滞在時間（秒）記録：除外対象は記録しない（＋日別バケットにも加算） */
export const logStayTime = async (
  siteKey: string,
  seconds: number,
  pageId?: string
) => {
  const cleanId = normalizePageId(pageId || "home");
  if (EXCLUDE_PAGES.includes(cleanId)) return;

  // 既存の累計イベントID（従来の可視化互換）
  const eventDoc = `home_stay_seconds_${cleanId}`;
  const totalRef = doc(db, "analytics", siteKey, "events", eventDoc);

  // ★ 追加: 日別キー（文字列ソートで範囲検索しやすい）
  const dateId = format(new Date(), "yyyy-MM-dd");
  const dailyDocId = `${dateId}_${eventDoc}`;
  const dailyRef = doc(db, "analytics", siteKey, "eventsDaily", dailyDocId);

  await runTransaction(db, async (tx) => {
    // 累計（従来どおり）
    const totalSnap = await tx.get(totalRef);
    const prev = totalSnap.exists()
      ? totalSnap.data()
      : { totalSeconds: 0, count: 0 };
    tx.set(
      totalRef,
      {
        totalSeconds: (prev.totalSeconds ?? 0) + seconds,
        count: (prev.count ?? 0) + 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // ★ 日別バケット（期間フィルタ用）
    const dailySnap = await tx.get(dailyRef);
    const prevDaily = dailySnap.exists()
      ? dailySnap.data()
      : { totalSeconds: 0, count: 0 };
    tx.set(
      dailyRef,
      {
        date: dateId, // ← 文字列で日付（範囲 where 用）
        eventId: eventDoc, // ← 例: home_stay_seconds_home
        totalSeconds: (prevDaily.totalSeconds ?? 0) + seconds,
        count: (prevDaily.count ?? 0) + 1,
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
        // 既存でも date を常に保持（将来のクエリ用）
        tx.set(
          dailyRef,
          { date: todayId, count: increment(1), updatedAt: serverTimestamp() },
          { merge: true }
        );
      } else {
        tx.set(dailyRef, {
          date: todayId,
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
    const referrer = document.referrer
      ? new URL(document.referrer).hostname.replace(/^www\./, "")
      : "direct";

    const baseRef = doc(db, "analytics", siteKey, "referrers", referrer);
    await setDoc(baseRef, { count: increment(1) }, { merge: true });

    // ★ 追加: 日別
    const dateId = format(new Date(), "yyyy-MM-dd");
    const dailyRef = doc(
      db,
      "analytics",
      siteKey,
      "referrersDaily",
      `${dateId}_${referrer}`
    );
    await setDoc(
      dailyRef,
      { date: dateId, host: referrer, count: increment(1) },
      { merge: true }
    );
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

/** 新規/リピーター判定（簡易・ローカルID採用）
 *  - ブラウザの localStorage に保存した visitorId を使用
 *  - 初訪: visitorStats/{visitorId} を新規作成し、集計 visitorStatsAgg/counts.new を +1
 *  - 再訪: 同 visitorId ドキュメントを更新し、visitorStatsAgg/counts.returning を +1
 */
export async function logVisitorType(siteKey: string) {
  try {
    const visitorId = getOrCreateVisitorId(siteKey);
    const personRef = doc(db, "analytics", siteKey, "visitorStats", visitorId);
    const aggRef = doc(db, "analytics", siteKey, "visitorStatsAgg", "counts");
    const dateId = format(new Date(), "yyyy-MM-dd");
    const dailyRef = doc(db, "analytics", siteKey, "visitorStatsDaily", dateId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(personRef);
      if (snap.exists()) {
        tx.update(personRef, {
          lastVisit: serverTimestamp(),
          visitCount: increment(1),
        });
        tx.set(aggRef, { returning: increment(1) }, { merge: true });
        // ★ 再訪を日別に
        tx.set(
          dailyRef,
          { date: dateId, returning: increment(1) },
          { merge: true }
        );
      } else {
        tx.set(personRef, {
          firstVisit: serverTimestamp(),
          lastVisit: serverTimestamp(),
          visitCount: 1,
        });
        tx.set(aggRef, { new: increment(1) }, { merge: true });
        // ★ 新規を日別に
        tx.set(dailyRef, { date: dateId, new: increment(1) }, { merge: true });
      }
    });
  } catch (e) {
    console.error("visitorType 記録エラー:", e);
  }
}

/** 地域別アクセス */
export async function logGeo(siteKey: string, region: string) {
  try {
    const baseRef = doc(db, "analytics", siteKey, "geoStats", region);
    const dateId = format(new Date(), "yyyy-MM-dd");
    const dailyRef = doc(
      db,
      "analytics",
      siteKey,
      "geoDaily",
      `${dateId}_${region}`
    );

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(baseRef);
      if (snap.exists()) tx.update(baseRef, { count: increment(1) });
      else tx.set(baseRef, { count: 1 });

      // ★ 日別
      tx.set(
        dailyRef,
        { date: dateId, region, count: increment(1) },
        { merge: true }
      );
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

/** visitorId（ブラウザごと・サイトごと）を localStorage に保存し再利用 */
function getOrCreateVisitorId(siteKey: string): string {
  const storageKey = `visitorId:${siteKey}`;
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const id = generateUUID();
    localStorage.setItem(storageKey, id);
    return id;
  } catch {
    // localStorage が使えない環境では都度UUID（＝毎回新規扱い）
    return generateUUID();
  }
}

/** UUID（ブラウザ互換を考慮） */
function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
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
