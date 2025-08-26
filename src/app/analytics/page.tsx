"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CardSpinner from "@/components/CardSpinner";
import { Bar } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import DailyAccessChart from "@/components/DailyAccessChart";
import ReferrerChart from "@/components/ReferrerChart";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip);

/* ───────── ラベル定義 ───────── */
const PAGE_LABELS: Record<string, string> = {
  home: "ホーム",
  about: "当店の思い",
  products: "施工実績",
  stores: "店舗一覧ページ",
  "uber-eats": "デリバリーページ",
  news: "お知らせページ",
  email: "メールアクセス",
  map_click: "マップアクセス",
  analytics: "アクセス解析",
  staffs: "スタッフ紹介ぺージ",
  jobApp: "応募ページ",
  menu: "メニューページ",
  cmd_sco: "その他",
};

const EVENT_LABELS: Record<string, string> = {
  home_stay_seconds_home: "ホーム滞在",
  home_stay_seconds_about: "当店の思い滞在",
  home_stay_seconds_products: "施工実績滞在",
  home_stay_seconds_stores: "店舗一覧滞在",
  home_stay_seconds_staffs: "スタッフ紹介滞在",
  home_stay_seconds_jobApp: "応募滞在",
  home_stay_seconds_news: "お知らせ滞在",
  home_stay_seconds_email: "メールアクセス滞在",
  home_stay_seconds_map_click: "マップアクセス滞在",
  home_stay_seconds_menu: "メニュー滞在時間",
};

const EXCLUDED_PAGE_IDS = ["login", "analytics", "community", "postList"];

type PageRow = { id: string; count: number };
type EventRow = { id: string; total: number; count: number; average: number };

export default function AnalyticsPage() {
  /* ───────── 表示データ（すべて累計） ───────── */
  const [pageData, setPageData] = useState<PageRow[]>([]);
  const [eventData, setEventData] = useState<EventRow[]>([]);
  const [hourlyData, setHourlyData] = useState<any | null>(null);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyRawCounts, setHourlyRawCounts] = useState<number[]>([]);
  const [dailyData, setDailyData] = useState<any | null>(null);
  const [referrerData, setReferrerData] = useState({
    sns: 0,
    search: 0,
    direct: 0,
  });
  const [weekdayData, setWeekdayData] = useState<any | null>(null);
  const [visitorStats, setVisitorStats] = useState<{
    new: number;
    returning: number;
  } | null>(null);
  const [bounceRates, setBounceRates] = useState<
    { page: string; rate: number }[]
  >([]);
  const [geoData, setGeoData] = useState<{ region: string; count: number }[]>(
    []
  );

  /* ───────── UI状態 ───────── */
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [open, setOpen] = useState(false);

  /* ───────── 累計：ページ別アクセス（pages） ───────── */
  const fetchPages = useCallback(async () => {
    const col = collection(db, "analytics", SITE_KEY, "pages");
    const snap = await getDocs(col);

    const rows: PageRow[] = snap.docs
      .map((d) => {
        const id = d.id;
        const count = (d.data() as any).count ?? 0;
        return { id, count };
      })
      .filter((r) => !EXCLUDED_PAGE_IDS.includes(r.id))
      .sort((a, b) => b.count - a.count);

    setPageData(rows);
  }, []);

  /* ───────── 累計：イベント滞在時間（events） ───────── */
  const fetchEvents = useCallback(async () => {
    const col = collection(db, "analytics", SITE_KEY, "events");
    const snap = await getDocs(col);

    const rows: EventRow[] = snap.docs
      .map((d) => {
        const id = d.id;
        const data = d.data() as { totalSeconds?: number; count?: number };
        const total = data.totalSeconds ?? 0;
        const count = data.count ?? 0;
        const average = count ? Math.round(total / count) : 0;
        return { id, total, count, average };
      })
      .sort((a, b) => b.total - a.total);

    setEventData(rows);
  }, []);

  /* ───────── 累計：時間帯別（hourlyLogs 全件） ───────── */
  function groupByHourAll(
    logs: { hour: number; accessedAt?: any }[]
  ): number[] {
    const hourlyCounts = Array(24).fill(0);
    for (const log of logs) {
      if (typeof log.hour === "number" && log.hour >= 0 && log.hour <= 23) {
        hourlyCounts[log.hour]++;
      }
    }
    return hourlyCounts;
  }

  function getHourlyChartData(counts: number[]) {
    return {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: "アクセス数",
          data: counts,
          backgroundColor: "rgba(255, 159, 64, 0.6)",
        },
      ],
    };
  }

  const fetchHourly = useCallback(async () => {
    setHourlyLoading(true);
    try {
      const logsRef = collection(db, "analytics", SITE_KEY, "hourlyLogs");
      const snap = await getDocs(logsRef);
      const logs = snap.docs.map(
        (doc) => doc.data() as { hour: number; accessedAt?: Timestamp }
      );
      const counts = groupByHourAll(logs);
      setHourlyRawCounts(counts);
      setHourlyData(getHourlyChartData(counts));
    } finally {
      setHourlyLoading(false);
    }
  }, []);

  /* ───────── 累計：日別アクセス（dailyLogs 全件） ───────── */
  const fetchDaily = useCallback(async () => {
    const col = collection(db, "analytics", SITE_KEY, "dailyLogs");
    const snap = await getDocs(col);

    const byDay: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const day = d.id; // "yyyy-MM-dd" 形式
      const count = (d.data() as any).count ?? 0;
      byDay[day] = (byDay[day] ?? 0) + count;
    });

    const days = Object.keys(byDay).sort(); // yyyy-MM-dd
    const counts = days.map((k) => byDay[k]);

    setDailyData({
      labels: days.length ? days : ["データなし"],
      datasets: [
        {
          label: "日別アクセス数（累計）",
          data: counts.length ? counts : [0],
          fill: false,
          borderColor: "rgba(75,192,192,1)",
          tension: 0.3,
        },
      ],
    });
  }, []);

  /* ───────── 累計：リファラー（referrers） ───────── */
  const fetchReferrers = useCallback(async () => {
    const col = collection(db, "analytics", SITE_KEY, "referrers");
    const snap = await getDocs(col);

    const total = { sns: 0, search: 0, direct: 0 };
    snap.docs.forEach((d) => {
      const host = d.id;
      const cnt = (d.data() as any).count ?? 0;

      if (host === "direct") total.direct += cnt;
      else if (
        /google\./.test(host) ||
        /bing\.com/.test(host) ||
        /yahoo\./.test(host)
      ) {
        total.search += cnt;
      } else {
        total.sns += cnt;
      }
    });

    setReferrerData(total);
  }, []);

  /* ───────── 累計：曜日別（weekdayLogs） ───────── */
  const fetchWeekday = useCallback(async () => {
    const ref = collection(db, "analytics", SITE_KEY, "weekdayLogs");
    const snap = await getDocs(ref);

    const weekdayIndex: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    const countsByWeekday = Array(7).fill(0);
    snap.docs.forEach((doc) => {
      const idx = weekdayIndex[doc.id];
      if (idx !== undefined) {
        countsByWeekday[idx] += (doc.data() as any).count ?? 0;
      }
    });

    setWeekdayData({
      labels: ["日", "月", "火", "水", "木", "金", "土"],
      datasets: [
        {
          label: "曜日別アクセス数（累計）",
          data: countsByWeekday,
          backgroundColor: "rgba(139, 92, 246, 0.6)",
        },
      ],
    });
  }, []);

  /* ───────── 累計：新規 vs. リピーター（visitorStats） ───────── */
  const fetchVisitors = useCallback(async () => {
    const col = collection(db, "analytics", SITE_KEY, "visitorStats");
    const snap = await getDocs(col);

    let n = 0;
    let r = 0;
    snap.docs.forEach((d) => {
      const data = d.data() as { new?: number; returning?: number };
      n += data.new ?? 0;
      r += data.returning ?? 0;
    });
    setVisitorStats({ new: n, returning: r });
  }, []);

  /* ───────── 累計：直帰率（bounceStats） ───────── */
  const fetchBounceRates = useCallback(async () => {
    const statsRef = collection(db, "analytics", SITE_KEY, "bounceStats");
    const snap = await getDocs(statsRef);

    const rates: { page: string; rate: number }[] = snap.docs.map((d) => {
      const { count = 0, totalViews = 0 } = d.data() as any;
      const rate = totalViews > 0 ? (count / totalViews) * 100 : 0;
      return { page: d.id, rate: Number(rate.toFixed(1)) };
    });

    // 高い順にソート
    rates.sort((a, b) => b.rate - a.rate);
    setBounceRates(rates);
  }, []);

  /* ───────── 累計：地域別（geoStats） ───────── */
  const fetchGeo = useCallback(async () => {
    const ref = collection(db, "analytics", SITE_KEY, "geoStats");
    const snap = await getDocs(ref);
    const arr = snap.docs
      .map((d) => ({ region: d.id, count: (d.data() as any).count as number }))
      .sort((a, b) => b.count - a.count);
    setGeoData(arr);
  }, []);

  /* ───────── 一括呼び出し（安定：Promise.allSettled） ───────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const tasks = [
        fetchPages(),
        fetchEvents(),
        fetchHourly(),
        fetchDaily(),
        fetchReferrers(),
        fetchWeekday(),
        fetchVisitors(),
        fetchBounceRates(),
        fetchGeo(),
      ];
      const results = await Promise.allSettled(tasks);
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          const names = [
            "fetchPages",
            "fetchEvents",
            "fetchHourly",
            "fetchDaily",
            "fetchReferrers",
            "fetchWeekday",
            "fetchVisitors",
            "fetchBounceRates",
            "fetchGeo",
          ];
          console.error(`${names[i]} failed:`, r.reason);
        }
      });
    } finally {
      setLoading(false);
    }
  }, [
    fetchPages,
    fetchEvents,
    fetchHourly,
    fetchDaily,
    fetchReferrers,
    fetchWeekday,
    fetchVisitors,
    fetchBounceRates,
    fetchGeo,
  ]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ───────── AI 改善提案（累計データをそのまま送る） ───────── */
  const handleAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: "全期間（累計）",
          pageData,
          eventData,
          hourlyData: hourlyRawCounts,
          dailyData,
          referrerData,
          weekdayData,
          visitorStats,
          bounceRates,
          geoData,
        }),
      });
      const data = await res.json();
      setAdvice(data.advice ?? "");
    } catch (err) {
      console.error("分析エラー:", err);
      setAdvice("AIによる提案の取得に失敗しました。");
    } finally {
      setAnalyzing(false);
    }
  };

  /* ───────── JSX ───────── */
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-bold text-white">アクセス解析（累計）</h2>

      {/* AI 提案 */}
      <div className="flex gap-3">
        {!advice && (
          <button
            onClick={handleAnalysis}
            disabled={analyzing}
            className={`px-3 py-1 rounded text-sm text-white w-50 ${
              analyzing ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600"
            }`}
          >
            {analyzing ? "分析中..." : "AI による改善提案"}
          </button>
        )}

        {advice && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>AIの改善提案を見る</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>AIによる改善提案</DialogTitle>
                <DialogDescription>
                  累計データをもとに、ホームページの改善案を表示しています。
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
                {advice}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 本体 */}
      {loading ? (
        <CardSpinner />
      ) : (
        <>
          {/* ページ別アクセス（累計） */}
          <div className="bg-white/50 rounded p-4 shadow mt-6">
            <h3 className="font-semibold text-lg mb-4">
              ページ別アクセス数（累計）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full h-64">
                <Bar
                  data={{
                    labels: pageData.length
                      ? pageData.map((d) => PAGE_LABELS[d.id] || d.id)
                      : ["データなし"],
                    datasets: [
                      {
                        label: "アクセス数",
                        data: pageData.length
                          ? pageData.map((d) => d.count)
                          : [0],
                        backgroundColor: "rgba(59, 130, 246, 0.6)",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { tooltip: { enabled: true } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: "件数" },
                      },
                    },
                  }}
                />
              </div>

              <div className="overflow-auto">
                <table className="w-full bg-gray-100/50 border text-sm table-fixed">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 border">ページ名</th>
                      <th className="p-2 border text-right">アクセス数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length ? (
                      pageData.map((row) => (
                        <tr key={row.id}>
                          <td className="p-2 border">
                            {PAGE_LABELS[row.id] || row.id}
                          </td>
                          <td className="p-2 border text-right">{row.count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2 border" colSpan={2}>
                          データがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 平均滞在時間（累計） */}
          <div className="bg-white/50 rounded p-4 shadow mt-6">
            <h3 className="font-semibold text-lg mb-4">
              ページ別平均滞在時間（累計）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full h-64">
                <Bar
                  data={{
                    labels: eventData.length
                      ? eventData.map((d) => EVENT_LABELS[d.id] || d.id)
                      : ["データなし"],
                    datasets: [
                      {
                        label: "平均滞在秒数",
                        data: eventData.length
                          ? eventData.map((d) => d.average)
                          : [0],
                        backgroundColor: "rgba(16, 185, 129, 0.6)",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { tooltip: { enabled: true } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: "秒" },
                      },
                    },
                  }}
                />
              </div>

              <div className="overflow-auto">
                <table className="w-full bg-gray-100/50 border text-sm table-fixed">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 border w-2/5">イベント名</th>
                      <th className="p-2 border text-right w-1/5">合計秒数</th>
                      <th className="p-2 border text-right w-1/5">回数</th>
                      <th className="p-2 border text-right w-1/5">平均秒数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventData.length ? (
                      eventData.map((row) => (
                        <tr key={row.id}>
                          <td className="p-2 border">
                            {EVENT_LABELS[row.id] || row.id}
                          </td>
                          <td className="p-2 border text-right">{row.total}</td>
                          <td className="p-2 border text-right">{row.count}</td>
                          <td className="p-2 border text-right">
                            {row.average}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2 border" colSpan={4}>
                          データがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 時間帯別（累計） */}
          {hourlyLoading ? (
            <CardSpinner />
          ) : hourlyData ? (
            <div className="bg-white/50 rounded p-4 shadow mt-6">
              <h3 className="font-semibold text-sm mb-2">
                時間帯別アクセス数（累計）
              </h3>
              <Bar
                data={hourlyData}
                options={{
                  responsive: true,
                  plugins: { tooltip: { enabled: true } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: "アクセス数" },
                    },
                  },
                }}
              />
            </div>
          ) : null}

          {/* 曜日別（累計） */}
          {weekdayData && (
            <div className="bg-white/50 rounded p-4 shadow mt-6">
              <h3 className="font-semibold text-sm mb-2">
                曜日別アクセス数（累計）
              </h3>
              <Bar
                data={weekdayData}
                options={{
                  responsive: true,
                  plugins: { tooltip: { enabled: true } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: "アクセス数" },
                    },
                  },
                }}
              />
            </div>
          )}

          {/* 日別推移（全期間の累計推移＝全件表示） */}
          {dailyData && (
            <div className="mt-8 bg-white/50">
              <DailyAccessChart data={dailyData} />
            </div>
          )}

          {/* リファラー（累計） */}
          {referrerData && (
            <div className="p-6">
              <ReferrerChart data={referrerData} />
            </div>
          )}

          {/* 新規 vs. リピーター（累計） */}
          {/* {visitorStats && (
            <div className="bg-white/50 rounded p-4 shadow mt-6">
              <h3 className="font-semibold text-sm mb-2">
                新規 vs. リピーター（累計）
              </h3>
              <Bar
                data={{
                  labels: ["新規", "リピーター"],
                  datasets: [
                    {
                      label: "訪問者数",
                      data: [visitorStats.new, visitorStats.returning],
                      backgroundColor: [
                        "rgba(96, 165, 250, 0.6)",
                        "rgba(34, 197, 94, 0.6)",
                      ],
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: { tooltip: { enabled: true } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          )} */}

          {/* 直帰率（累計） */}
          {/* {bounceRates.length > 0 && (
            <div className="bg-white/50 rounded p-4 shadow mt-6">
              <h3 className="font-semibold text-sm mb-2">直帰率（% / 累計）</h3>
              <Bar
                data={{
                  labels: bounceRates.map((d) => PAGE_LABELS[d.page] || d.page),
                  datasets: [
                    {
                      label: "直帰率 (%)",
                      data: bounceRates.map((d) => d.rate),
                      backgroundColor: "rgba(239, 68, 68, 0.6)",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: { display: true, text: "直帰率 (%)" },
                    },
                  },
                  plugins: {
                    tooltip: {
                      callbacks: { label: (ctx) => `${ctx.parsed.y}%` },
                    },
                  },
                }}
              />
            </div>
          )} */}

          {/* 地域別（累計） */}
          {geoData.length > 0 && (
            <div className="bg-white/50 rounded p-4 shadow mt-6">
              <h3 className="font-semibold text-sm mb-2">
                地域別アクセス分布（累計）
              </h3>
              <Bar
                data={{
                  labels: geoData.map((d) => d.region),
                  datasets: [
                    {
                      label: "アクセス数",
                      data: geoData.map((d) => d.count),
                      backgroundColor: "rgba(37, 99, 235, 0.6)",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: { tooltip: { enabled: true } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: "アクセス数" },
                    },
                  },
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
