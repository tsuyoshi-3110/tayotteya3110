"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, Timestamp, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, subDays } from "date-fns";
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

/* ───────── 期間計算用ヘルパー ───────── */
const calcStart = (daysAgo: number) =>
  format(subDays(new Date(), daysAgo), "yyyy-MM-dd");

const TODAY = format(new Date(), "yyyy-MM-dd");
const DEFAULT_START = calcStart(30);

/* ───────── 表示ラベル ───────── */
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

export default function AnalyticsPage() {
  const [pageData, setPageData] = useState<{ id: string; count: number }[]>([]);
  const [eventData, setEventData] = useState<
    { id: string; total: number; count: number; average: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(TODAY);

  const [advice, setAdvice] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

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

  const [open, setOpen] = useState(false);

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

  const presets = [
    { label: "過去 1 週間", days: 7 },
    { label: "過去 1 か月", days: 30 },
    { label: "過去 3 か月", days: 90 },
  ];

  const handlePreset = (days: number) => {
    setStartDate(calcStart(days));
    setEndDate(TODAY);
    setAdvice("");
  };

  /* ───────── 地域別（SITE_KEYを使用） ───────── */
  useEffect(() => {
    const fetchGeo = async () => {
      try {
        const ref = collection(db, "analytics", SITE_KEY, "geoDaily");
        const q = query(
          ref,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const snap = await getDocs(q);

        const byRegion: Record<string, number> = {};
        snap.docs.forEach((d) => {
          const { region, count = 0 } = d.data() as {
            region: string;
            count?: number;
          };
          byRegion[region] = (byRegion[region] ?? 0) + count;
        });

        setGeoData(
          Object.entries(byRegion).map(([region, count]) => ({ region, count }))
        );
      } catch (e) {
        console.error("geoDaily 取得エラー:", e);
      }
    };
    fetchGeo();
  }, [startDate, endDate]);

  /* ───────── 期間変更時はAI提案をリセット ───────── */
  useEffect(() => {
    setAdvice("");
  }, [startDate, endDate]);

  /* ───────── 直帰率（全期間） ───────── */
  useEffect(() => {
    const fetchBounce = async () => {
      try {
        const ref = collection(db, "analytics", SITE_KEY, "bounceDaily");
        const q = query(
          ref,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const snap = await getDocs(q);

        const byPage: Record<string, { views: number; bounces: number }> = {};
        snap.docs.forEach((d) => {
          const {
            pageId,
            totalViews = 0,
            count = 0,
          } = d.data() as {
            pageId: string;
            totalViews?: number;
            count?: number;
          };
          if (!byPage[pageId]) byPage[pageId] = { views: 0, bounces: 0 };
          byPage[pageId].views += totalViews;
          byPage[pageId].bounces += count;
        });

        const rates = Object.entries(byPage).map(([page, v]) => ({
          page,
          rate: v.views > 0 ? (v.bounces / v.views) * 100 : 0,
        }));
        setBounceRates(rates);
      } catch (e) {
        console.error("bounceDaily 取得エラー:", e);
      }
    };
    fetchBounce();
  }, [startDate, endDate]);

  /* ───────── 新規/リピーター（visitorStatsAgg があればそれを優先） ───────── */
  useEffect(() => {
    const fetchVisitorStats = async () => {
      try {
        const ref = collection(db, "analytics", SITE_KEY, "visitorStatsDaily");
        const q = query(
          ref,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const snap = await getDocs(q);

        let newTotal = 0,
          returningTotal = 0;
        snap.docs.forEach((d) => {
          const data = d.data() as { new?: number; returning?: number };
          newTotal += data.new ?? 0;
          returningTotal += data.returning ?? 0;
        });

        setVisitorStats({ new: newTotal, returning: returningTotal });
      } catch (e) {
        console.error("visitorStatsDaily 取得エラー:", e);
      }
    };
    fetchVisitorStats();
  }, [startDate, endDate]);

  /* ───────── 曜日別アクセス（全期間の累積） ───────── */
 useEffect(() => {
  const fetchWeekdayAccessData = async () => {
    try {
      const ref = collection(db, "analytics", SITE_KEY, "dailyLogs");
      // ドキュメントID範囲でサーバ側フィルタ
      const q = query(
        ref,
        where(documentId(), ">=", startDate),
        where(documentId(), "<=", endDate)
      );
      const snap = await getDocs(q);

      const counts = Array(7).fill(0) as number[];
      snap.docs.forEach((d) => {
        const dateStr = d.id; // "YYYY-MM-DD"
        const n = (d.data().count as number) ?? 0;
        const dt = new Date(`${dateStr}T00:00:00`); // ローカルTZでOK
        counts[dt.getDay()] += n;
      });

      setWeekdayData({
        labels: ["日", "月", "火", "水", "木", "金", "土"],
        datasets: [
          {
            label: "曜日別アクセス数",
            data: counts,
            backgroundColor: "rgba(139, 92, 246, 0.6)",
          },
        ],
      });
    } catch (err) {
      console.error("曜日別アクセス（期間）取得エラー:", err);
    }
  };

  fetchWeekdayAccessData();
}, [startDate, endDate]);


  /* ───────── リファラー（全期間の累積） ───────── */
  useEffect(() => {
    const fetchReferrers = async () => {
      try {
        const ref = collection(db, "analytics", SITE_KEY, "referrersDaily");
        const q = query(
          ref,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const snap = await getDocs(q);

        const total = { sns: 0, search: 0, direct: 0 };
        snap.docs.forEach((d) => {
          const { host = "direct", count = 0 } = d.data() as {
            host?: string;
            count?: number;
          };
          if (host === "direct") total.direct += count;
          else if (
            /google\./.test(host) ||
            /bing\.com/.test(host) ||
            /yahoo\./.test(host)
          )
            total.search += count;
          else total.sns += count;
        });

        setReferrerData(total);
      } catch (e) {
        console.error("referrersDaily 取得エラー:", e);
      }
    };
    fetchReferrers();
  }, [startDate, endDate]);

  /* ───────── 日別アクセス（期間でフィルタ） ───────── */
 useEffect(() => {
  const fetchDailyData = async () => {
    try {
      const ref = collection(db, "analytics", SITE_KEY, "dailyLogs");
      // ドキュメントID（= "YYYY-MM-DD"）でサーバ側フィルタ
      const q = query(
        ref,
        where(documentId(), ">=", startDate),
        where(documentId(), "<=", endDate)
      );
      const snap = await getDocs(q);

      const rows = snap.docs
        .map((d) => ({ id: d.id, count: (d.data().count as number) ?? 0 }))
        .sort((a, b) => (a.id < b.id ? -1 : 1));

      setDailyData({
        labels: rows.map((r) => r.id),
        datasets: [
          {
            label: "日別アクセス数",
            data: rows.map((r) => r.count),
            fill: false,
            borderColor: "rgba(75,192,192,1)",
            tension: 0.3,
          },
        ],
      });
    } catch (err) {
      console.error("日別データ取得エラー:", err);
    }
  };

  fetchDailyData();
}, [startDate, endDate]);


  /* ───────── 時間帯別アクセス（期間でフィルタ） ───────── */
  useEffect(() => {
    const fetchHourlyData = async () => {
      setHourlyLoading(true);
      try {
        const start = new Date(startDate);
        const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        const logsRef = collection(db, "analytics", SITE_KEY, "hourlyLogs");
        const q = query(
          logsRef,
          where("accessedAt", ">=", start),
          where("accessedAt", "<=", end)
        );
        const snap = await getDocs(q);
        const logs = snap.docs.map(
          (docu) => docu.data() as { hour: number; accessedAt?: Timestamp }
        );

        const hourlyCounts = Array(24).fill(0) as number[];
        logs.forEach((l) => {
          if (typeof l.hour === "number" && l.hour >= 0 && l.hour <= 23) {
            hourlyCounts[l.hour] += 1;
          }
        });

        setHourlyRawCounts(hourlyCounts);
        setHourlyData({
          labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
          datasets: [
            {
              label: "アクセス数",
              data: hourlyCounts,
              backgroundColor: "rgba(255, 159, 64, 0.6)",
            },
          ],
        });
      } catch (err) {
        console.error("時間帯データ取得エラー:", err);
      } finally {
        setHourlyLoading(false);
      }
    };

    fetchHourlyData();
  }, [startDate, endDate]);

  /* ───────── メイン集計（ページ別PV & 平均滞在時間） ───────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate
        ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
        : null;

      // ページ別アクセス数（hourlyLogs を期間で絞る）
      {
        const logsCol = collection(db, "analytics", SITE_KEY, "hourlyLogs");
        let q: any = logsCol;
        if (start && end) {
          q = query(
            logsCol,
            where("accessedAt", ">=", start),
            where("accessedAt", "<=", end)
          );
        } else if (start) {
          q = query(logsCol, where("accessedAt", ">=", start));
        } else if (end) {
          q = query(logsCol, where("accessedAt", "<=", end));
        }

        const logsSnap = await getDocs(q);
        const pages: Record<string, number> = {};
        logsSnap.docs.forEach((d) => {
          const { pageId } = d.data() as { pageId?: string };
          if (!pageId) return;
          const id = pageId.startsWith("products/") ? "products" : pageId;
          if (EXCLUDED_PAGE_IDS.includes(id)) return;
          pages[id] = (pages[id] ?? 0) + 1;
        });

        const sortedPages = Object.entries(pages)
          .map(([id, count]) => ({ id, count }))
          .sort((a, b) => b.count - a.count);
        setPageData(sortedPages);
      }

      // 平均滞在時間（★ 期間フィルタ可能: eventsDaily を使用）
      /* ───────── 平均滞在時間（期間フィルタ＝厳密。フォールバック無し） ───────── */
      {
        type DailyEventRow = {
          date: string; // "YYYY-MM-DD"
          eventId: string; // "home_stay_seconds_home" 等
          totalSeconds?: number;
          count?: number;
        };

        const eventsDailyRef = collection(
          db,
          "analytics",
          SITE_KEY,
          "eventsDaily"
        );
        const eventsQ = query(
          eventsDailyRef,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const eventsSnap = await getDocs(eventsQ);

        if (eventsSnap.empty) {
          // 期間内にデータがない場合は空にする（＝0表示）
          setEventData([]);
        } else {
          const agg: Record<string, { totalSeconds: number; count: number }> =
            {};

          eventsSnap.forEach((docu) => {
            const {
              eventId,
              totalSeconds = 0,
              count = 0,
            } = docu.data() as DailyEventRow;
            if (!eventId) return;
            agg[eventId] = {
              totalSeconds: (agg[eventId]?.totalSeconds ?? 0) + totalSeconds,
              count: (agg[eventId]?.count ?? 0) + count,
            };
          });

          const sorted = Object.entries(agg)
            .map(([id, v]) => ({
              id,
              total: v.totalSeconds,
              count: v.count,
              average: v.count ? Math.round(v.totalSeconds / v.count) : 0,
            }))
            .sort((a, b) => b.total - a.total);

          setEventData(sorted);
        }
      }
    } catch (e) {
      console.error("取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  /* ───────── AI 解析 ───────── */
  const handleAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: startDate && endDate ? `${startDate}〜${endDate}` : "全期間",
          pageData,
          eventData,
          hourlyData: hourlyRawCounts,
          dailyData,
          referrerData,
          // 以前は weekdayData.data を送っていたが未定義なので修正
          weekdayCounts: weekdayData?.datasets?.[0]?.data ?? null,
          visitorStats,
          bounceRates,
          geoData,
        }),
      });

      const data = await res.json();
      setAdvice(data.advice);
    } catch (err) {
      console.error("分析エラー:", err);
      setAdvice("AIによる提案の取得に失敗しました。");
    } finally {
      setAnalyzing(false);
    }
  };

  /* ───────── 初回＆期間変更時のデータ取得 ───────── */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-bold text-white">アクセス解析</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map((p) => {
          const isActive = startDate === calcStart(p.days) && endDate === TODAY;
          return (
            <Button
              key={p.days}
              onClick={() => handlePreset(p.days)}
              variant={isActive ? "default" : "secondary"}
              className={`text-xs ${isActive ? "pointer-events-none" : ""}`}
            >
              {p.label}
            </Button>
          );
        })}
      </div>

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
                  この期間のアクセスデータをもとに、ホームページの改善案を表示しています。
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
                {advice}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <CardSpinner />
      ) : (
        <>
          {/* ページ別アクセス数 */}
          <div className="bg-white/50 rounded p-4 shadow mt-6">
            <h3 className="font-semibold text-lg mb-4">ページ別アクセス数</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full h-64">
                <Bar
                  data={{
                    labels: pageData.map((d) => PAGE_LABELS[d.id] || d.id),
                    datasets: [
                      {
                        label: "アクセス数",
                        data: pageData.map((d) => d.count),
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
                    {pageData.map((row) => (
                      <tr key={row.id}>
                        <td className="p-2 border">
                          {PAGE_LABELS[row.id] || row.id}
                        </td>
                        <td className="p-2 border text-right">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ページ別平均滞在時間 */}
          <div className="bg-white/50 rounded p-4 shadow mt-6">
            <h3 className="font-semibold text-lg mb-4">ページ別平均滞在時間</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full h-64">
                <Bar
                  data={{
                    labels: eventData.map((d) => EVENT_LABELS[d.id] || d.id),
                    datasets: [
                      {
                        label: "平均滞在秒数",
                        data: eventData.map((d) => d.average),
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
                    {eventData.map((row) => (
                      <tr key={row.id}>
                        <td className="p-2 border">
                          {EVENT_LABELS[row.id] || row.id}
                        </td>
                        <td className="p-2 border text-right">{row.total}</td>
                        <td className="p-2 border text-right">{row.count}</td>
                        <td className="p-2 border text-right">{row.average}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 時間帯別アクセス */}
          {hourlyLoading ? (
            <CardSpinner />
          ) : hourlyData ? (
            <div className="bg-white/50 rounded p-4 shadow mt-6">
              <h3 className="font-semibold text-sm mb-2">時間帯別アクセス数</h3>
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

          {/* 曜日別アクセス */}
          {weekdayData && (
            <div className="bg-white/50 rounded p-4 shadow mt-6">
              <h3 className="font-semibold text-sm mb-2">曜日別アクセス数</h3>
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

          {/* 日別アクセス */}
          {dailyData && (
            <div className="mt-8 bg-white/50">
              <DailyAccessChart data={dailyData} />
            </div>
          )}

          {/* リファラー */}
          {referrerData && (
            <div className="p-6">
              <ReferrerChart data={referrerData} />
            </div>
          )}
        </>
      )}

      {/* 新規 vs. リピーター */}
      {visitorStats && (
        <div className="bg-white/50 rounded p-4 shadow mt-6">
          <h3 className="font-semibold text-sm mb-2">新規 vs. リピーター</h3>
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
      )}

      {/* 直帰率 */}
      {bounceRates.length > 0 && (
        <div className="bg-white/50 rounded p-4 shadow mt-6">
          <h3 className="font-semibold text-sm mb-2">直帰率（%）</h3>
          <Bar
            data={{
              labels: bounceRates.map((d) => PAGE_LABELS[d.page] || d.page),
              datasets: [
                {
                  label: "直帰率 (%)",
                  data: bounceRates.map((d) => Number(d.rate.toFixed(1))),
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
      )}

      {/* 地域別アクセス */}
      {geoData.length > 0 && (
        <div className="bg-white/50 rounded p-4 shadow mt-6">
          <h3 className="font-semibold text-sm mb-2">地域別アクセス分布</h3>
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
    </div>
  );
}
