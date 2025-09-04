"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import CardSpinner from "@/components/CardSpinner";

/** ▼ 指定の対象言語リスト（そのまま使用） */
const LANGS = [
  { key: "en", label: "英語", emoji: "🇺🇸" },
  { key: "zh", label: "中国語(簡体)", emoji: "🇨🇳" },
  { key: "zh-TW", label: "中国語(繁体)", emoji: "🇹🇼" },
  { key: "ko", label: "韓国語", emoji: "🇰🇷" },
  { key: "fr", label: "フランス語", emoji: "🇫🇷" },
  { key: "es", label: "スペイン語", emoji: "🇪🇸" },
  { key: "de", label: "ドイツ語", emoji: "🇩🇪" },
  { key: "pt", label: "ポルトガル語", emoji: "🇵🇹" },
  { key: "it", label: "イタリア語", emoji: "🇮🇹" },
  { key: "ru", label: "ロシア語", emoji: "🇷🇺" },
  { key: "th", label: "タイ語", emoji: "🇹🇭" },
  { key: "vi", label: "ベトナム語", emoji: "🇻🇳" },
  { key: "id", label: "インドネシア語", emoji: "🇮🇩" },
  { key: "hi", label: "ヒンディー語", emoji: "🇮🇳" },
  { key: "ar", label: "アラビア語", emoji: "🇸🇦" },
] as const;

/** ▼ UI上の言語選択肢：日本語（基準）を先頭に足す */
const UI_LANGS = [{ key: "ja", label: "日本語", emoji: "🇯🇵" }, ...LANGS];

/** ▼ 'ja' を含む Union（型の安定用） */
type LangKey = "ja" | (typeof LANGS)[number]["key"];

type UIStrings = {
  title: string;
  subtitle: string;
  namePH: string;
  kanaPH: string;
  emailPH: string;
  messagePH: string;
  send: string;
  sending: string;
  sent: string;
  success: string;
  langLabel: string;
};

/** ▼ 基準（日本語）の文言。これを元に /api/translate で各言語へ一括翻訳します。 */
const BASE_JA: UIStrings = {
  title: "求人応募フォーム",
  subtitle: "以下の内容をご入力のうえ、「送信」ボタンを押してください。",
  namePH: "お名前（例：大阪 太郎）",
  kanaPH: "ふりがな（例：おおさか たろう）",
  emailPH: "メールアドレス",
  messagePH: "志望動機・自己PRなど",
  send: "送信",
  sending: "送信中...",
  sent: "送信完了 🎉",
  success: "応募が完了しました。ご応募ありがとうございます。",
  langLabel: "言語",
};

const SEP = "\n---\n";

/** ▼ navigator.language を UI_LANGS に寄せて初期判定 */
function detectInitialLang(): LangKey {
  if (typeof navigator === "undefined") return "ja";
  const nav = navigator.language.toLowerCase();

  // 厳密マッチ優先
  const exact = UI_LANGS.find((l) => l.key.toLowerCase() === nav);
  if (exact) return exact.key as LangKey;

  // 代表的なマップ
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("zh-tw") || nav.includes("hant")) return "zh-TW";
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("de")) return "de";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("it")) return "it";
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("th")) return "th";
  if (nav.startsWith("vi")) return "vi";
  if (nav.startsWith("id")) return "id";
  if (nav.startsWith("hi")) return "hi";
  if (nav.startsWith("ar")) return "ar";

  return "ja";
}

export default function JobPage() {
  /** ▼ 言語状態＆UI文言（翻訳キャッシュ付き） */
  const [lang, setLang] = useState<LangKey>(detectInitialLang);
  const [ui, setUI] = useState<UIStrings>(BASE_JA);
  const [uiCache, setUiCache] = useState<Partial<Record<LangKey, UIStrings>>>({
    ja: BASE_JA,
  });
  const [uiLoading, setUiLoading] = useState(false);
  const isRTL = useMemo(() => lang === "ar", [lang]);

  /** ▼ フォーム状態 */
  const [name, setName] = useState("");
  const [kana, setKana] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");

  /** ▼ 言語切替時にUI文言を翻訳（キャッシュ済みなら使用） */
  useEffect(() => {
    if (lang === "ja") {
      setUI(BASE_JA);
      return;
    }
    const hit = uiCache[lang];
    if (hit) {
      setUI(hit);
      return;
    }

    (async () => {
      setUiLoading(true); // ← スピナーON
      try {
        const source = [
          BASE_JA.title,
          BASE_JA.subtitle,
          BASE_JA.namePH,
          BASE_JA.kanaPH,
          BASE_JA.emailPH,
          BASE_JA.messagePH,
          BASE_JA.send,
          BASE_JA.sending,
          BASE_JA.sent,
          BASE_JA.success,
          BASE_JA.langLabel,
        ].join(SEP);

        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "", body: source, target: lang }),
        });

        if (!res.ok) throw new Error("translate failed");

        const data = (await res.json()) as { body?: string };
        const parts = String(data.body ?? "").split(SEP);

        const translated: UIStrings = {
          title: parts[0]?.trim() || BASE_JA.title,
          subtitle: parts[1]?.trim() || BASE_JA.subtitle,
          namePH: parts[2]?.trim() || BASE_JA.namePH,
          kanaPH: parts[3]?.trim() || BASE_JA.kanaPH,
          emailPH: parts[4]?.trim() || BASE_JA.emailPH,
          messagePH: parts[5]?.trim() || BASE_JA.messagePH,
          send: parts[6]?.trim() || BASE_JA.send,
          sending: parts[7]?.trim() || BASE_JA.sending,
          sent: parts[8]?.trim() || BASE_JA.sent,
          success: parts[9]?.trim() || BASE_JA.success,
          langLabel: parts[10]?.trim() || BASE_JA.langLabel,
        };

        setUI(translated);
        setUiCache((prev) => ({ ...prev, [lang]: translated }));
      } catch {
        // 失敗時は日本語を維持
        setUI(BASE_JA);
      } finally {
        setUiLoading(false); // ← スピナーOFF
      }
    })();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  /** ▼ 送信 */
  const handleSubmit = async () => {
    // 日本語UIのときのみ kana 必須。他言語のときは name を代入して送る。
    if (!name || !email || !message || !SITE_KEY || (lang === "ja" && !kana)) {
      alert(
        lang === "ja"
          ? "必須項目を入力してください。"
          : "Please fill in all required fields."
      );
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/send-job-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          kana: lang === "ja" ? kana : name,
          email,
          message,
          SITE_KEY,
          // 参考: 受信側で言語が分かるように添付（任意）
          locale: lang,
        }),
      });

      if (res.ok) {
        setStatus("sent");
        setName("");
        setKana("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("idle");
        alert(
          lang === "ja"
            ? "送信に失敗しました。再度お試しください。"
            : "Failed to send. Please try again."
        );
      }
    } catch {
      setStatus("idle");
      alert(
        lang === "ja"
          ? "送信に失敗しました。ネットワークをご確認ください。"
          : "Failed to send. Please check your network."
      );
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b py-12 px-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-200 relative"
        aria-busy={uiLoading ? "true" : "false"}
      >
        {/* 変換中オーバーレイ */}
        {uiLoading && <CardSpinner />}

        {/* 言語切替 */}
        <div className="flex items-center justify-end mb-4 gap-2">
          <label htmlFor="lang" className="text-sm text-gray-600">
            {ui.langLabel}
          </label>
          <select
            id="lang"
            value={lang}
            onChange={(e) => setLang(e.target.value as LangKey)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
            disabled={uiLoading || status === "loading"}
          >
            {UI_LANGS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.emoji} {l.label} / {l.key}
              </option>
            ))}
          </select>
        </div>

        <h1 className="text-3xl font-bold mb-4 text-center text-sky-700">
          {ui.title}
        </h1>
        <p className="mb-6 text-gray-600 text-center">{ui.subtitle}</p>

        <div className="space-y-4">
          <Input
            placeholder={ui.namePH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-gray-50"
            disabled={uiLoading || status === "loading"}
          />

          {/* 日本語UI時のみ ふりがなを表示・必須 */}
          {lang === "ja" && (
            <Input
              placeholder={ui.kanaPH}
              value={kana}
              onChange={(e) => setKana(e.target.value)}
              className="bg-gray-50"
              disabled={uiLoading || status === "loading"}
            />
          )}

          <Input
            type="email"
            placeholder={ui.emailPH}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-50"
            disabled={uiLoading || status === "loading"}
          />

          <Textarea
            placeholder={ui.messagePH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-gray-50 min-h-[150px]"
            disabled={uiLoading || status === "loading"}
          />

          <Button
            onClick={handleSubmit}
            disabled={status === "loading" || uiLoading}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white"
          >
            {status === "loading"
              ? ui.sending
              : status === "sent"
              ? ui.sent
              : ui.send}
          </Button>
        </div>

        {status === "sent" && (
          <p className="text-green-600 mt-4 text-center">{ui.success}</p>
        )}
      </div>
    </div>
  );
}
