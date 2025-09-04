// components/job/JobApplyForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { MessageSquareMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { THEMES, ThemeKey } from "@/lib/themes";

/* ===============================
   言語リスト＋日本語（既定）
================================ */
const BASE_LANG = { key: "ja", label: "日本語", emoji: "🇯🇵" } as const;
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
type LangKey = typeof BASE_LANG.key | (typeof LANGS)[number]["key"];

const DARK_KEYS: ThemeKey[] = ["brandH", "brandG", "brandI"];

/* ===============================
   時間スロット（30分刻み）
================================ */
const genTimes = (start = "09:00", end = "18:00") => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const arr: string[] = [];
  let h = sh, m = sm;
  while (h < eh || (h === eh && m <= em)) {
    arr.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h += 1; m = 0; }
  }
  return arr;
};
const TIME_SLOTS = genTimes("09:00", "18:00");

/* ===============================
   連絡方法（内部既定で "phone"）
================================ */
const CONTACT_METHODS = [
  { key: "phone", label: "電話" },
  { key: "email", label: "メール" },
  { key: "line", label: "LINE" },
] as const;

/* ===============================
   フォーム型（手書き：ESLint対策）
================================ */
type FormValues = {
  name: string;
  phone: string;
  email: string;
  contactMethod: "phone" | "email" | "line";
  date: string;
  time: string;
  address: string;
  notes: string;
};

/* ===============================
   多言語テキスト定義
================================ */
type Strings = {
  ui: {
    sectionTitle: string;
    sectionHelp: string;
    name: string;
    phone: string;
    email: string;
    date: string;
    time: string;
    timeSelectPlaceholder: string;
    address: string;
    notes: string;
    submit: string;
    sending: string;
    namePh: string;
    phonePh: string;
    emailPh: string;
    addressPh: string;
    notesPh: string;
    langPickerLabel: string;
  };
  modal: {
    doneTitle: string;
    doneLine1: (name: string) => string;
    doneLine2: string;
    close: string;
  };
  errors: {
    name: string;
    phone: string;
    phoneFormat: string;
    email: string;
    emailFormat: string;
    date: string;
    dateFormat: string;
    time: string;
    address: string;
    notes: string;
    notesMax: string;
  };
};

const JP: Strings = {
  ui: {
    sectionTitle: "ご依頼内容",
    sectionHelp: "全ての項目をご入力ください。担当者より折り返しご連絡いたします。",
    name: "お名前",
    phone: "電話番号",
    email: "メールアドレス",
    date: "ご希望日",
    time: "ご希望時間",
    timeSelectPlaceholder: "選択してください",
    address: "ご住所",
    notes: "ご要望・相談内容",
    submit: "この内容で依頼する",
    sending: "送信中…",
    namePh: "山田 太郎",
    phonePh: "09012345678",
    emailPh: "example@example.com",
    addressPh: "例）大阪府豊中市小曽根3-6-13",
    notesPh: "サービス内容をご記入ください",
    langPickerLabel: "表示言語",
  },
  modal: {
    doneTitle: "送信が完了しました",
    doneLine1: (name) => `${name} 様、ありがとうございます。`,
    doneLine2: "担当者より折り返しご連絡いたします。",
    close: "閉じる",
  },
  errors: {
    name: "お名前を入力してください",
    phone: "電話番号を入力してください",
    phoneFormat: "半角数字・記号で入力してください",
    email: "メールアドレスを入力してください",
    emailFormat: "メールアドレスの形式が不正です",
    date: "ご希望日を選択してください",
    dateFormat: "日付形式が不正です",
    time: "ご希望時間を選択してください",
    address: "ご住所を入力してください",
    notes: "ご要望・相談内容を入力してください",
    notesMax: "ご要望が長すぎます",
  },
};

/* ===============================
   日付ユーティリティ
================================ */
function todayISO(): string {
  const tz = "Asia/Tokyo";
  const d = new Date();
  const y = d.toLocaleString("ja-JP", { timeZone: tz, year: "numeric" });
  const m = d.toLocaleString("ja-JP", { timeZone: tz, month: "2-digit" });
  const day = d.toLocaleString("ja-JP", { timeZone: tz, day: "2-digit" });
  return `${y}-${m}-${day}`;
}

/* ===============================
   本体
================================ */
export default function JobApplyForm() {
  const gradient = useThemeGradient();
  const isDark =
    !!gradient &&
    DARK_KEYS.includes(
      (Object.keys(THEMES).find((k) => THEMES[k as ThemeKey] === gradient) as ThemeKey) ?? "brandA"
    );

  // 言語状態
  const [lang, setLang] = useState<LangKey>("ja");
  const [strings, setStrings] = useState<Strings>(JP);
  const [loadingLang, setLoadingLang] = useState(false);
  const cacheRef = useRef<Map<LangKey, Strings>>(new Map([["ja", JP]]));

  // 翻訳（キャッシュ＋1回のAPIでまとめて取得）
  const ensureStrings = async (target: LangKey) => {
    if (target === "ja") {
      setStrings(JP);
      return;
    }
    if (cacheRef.current.has(target)) {
      setStrings(cacheRef.current.get(target)!);
      return;
    }
    setLoadingLang(true);
    try {
      const kv: Array<[keyof Strings["ui"], string]> = [
        ["sectionTitle", JP.ui.sectionTitle],
        ["sectionHelp", JP.ui.sectionHelp],
        ["name", JP.ui.name],
        ["phone", JP.ui.phone],
        ["email", JP.ui.email],
        ["date", JP.ui.date],
        ["time", JP.ui.time],
        ["timeSelectPlaceholder", JP.ui.timeSelectPlaceholder],
        ["address", JP.ui.address],
        ["notes", JP.ui.notes],
        ["submit", JP.ui.submit],
        ["sending", JP.ui.sending],
        ["namePh", JP.ui.namePh],
        ["phonePh", JP.ui.phonePh],
        ["emailPh", JP.ui.emailPh],
        ["addressPh", JP.ui.addressPh],
        ["notesPh", JP.ui.notesPh],
        ["langPickerLabel", JP.ui.langPickerLabel],
      ];

      const ev: Array<[keyof Strings["errors"], string]> = [
        ["name", JP.errors.name],
        ["phone", JP.errors.phone],
        ["phoneFormat", JP.errors.phoneFormat],
        ["email", JP.errors.email],
        ["emailFormat", JP.errors.emailFormat],
        ["date", JP.errors.date],
        ["dateFormat", JP.errors.dateFormat],
        ["time", JP.errors.time],
        ["address", JP.errors.address],
        ["notes", JP.errors.notes],
        ["notesMax", JP.errors.notesMax],
      ];

      const modalConst = ["送信が完了しました", "担当者より折り返しご連絡いたします。", "閉じる"].join("\n");
      const bodyToTranslate = [
        kv.map(([, v]) => v).join("\n"),
        ev.map(([, v]) => v).join("\n"),
        modalConst,
        "{name} 様、ありがとうございます。",
      ].join("\n---\n");

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", body: bodyToTranslate, target }),
      });
      if (!res.ok) throw new Error("translate API error");
      const data = (await res.json()) as { body?: string };
      const translated = (data.body ?? "").split("\n---\n");

      const uiLines = (translated[0] ?? "").split("\n");
      const errLines = (translated[1] ?? "").split("\n");
      const modalLines = (translated[2] ?? "").split("\n");
      const modalNameTpl = (translated[3] ?? "").trim() || "{name}";

      const ui: Strings["ui"] = { ...JP.ui };
      kv.forEach(([k], i) => {
        if (uiLines[i]) (ui as any)[k] = uiLines[i];
      });

      const errors: Strings["errors"] = { ...JP.errors };
      ev.forEach(([k], i) => {
        if (errLines[i]) (errors as any)[k] = errLines[i];
      });

      const modal: Strings["modal"] = {
        doneTitle: modalLines[0] || JP.modal.doneTitle,
        doneLine1: (name: string) =>
          (modalNameTpl || "{name}").replace("{name}", name),
        doneLine2: modalLines[1] || JP.modal.doneLine2,
        close: modalLines[2] || JP.modal.close,
      };

      const pack: Strings = { ui, modal, errors };
      cacheRef.current.set(target, pack);
      setStrings(pack);
    } catch (e) {
      console.error(e);
      setStrings(JP);
      setLang("ja");
      alert("翻訳に失敗しました。日本語に戻します。");
    } finally {
      setLoadingLang(false);
    }
  };

  useEffect(() => {
    void ensureStrings(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // 言語ごとにバリデーションメッセージを再構築
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, strings.errors.name),
        phone: z
          .string()
          .min(8, strings.errors.phone)
          .regex(/^[0-9+\-() ]+$/, strings.errors.phoneFormat),
        email: z
          .string()
          .min(1, strings.errors.email)
          .email(strings.errors.emailFormat),
        contactMethod: z.enum(["phone", "email", "line"]),
        date: z
          .string()
          .min(1, strings.errors.date)
          .regex(/^\d{4}-\d{2}-\d{2}$/, strings.errors.dateFormat),
        time: z.string().min(1, strings.errors.time),
        address: z.string().min(1, strings.errors.address),
        notes: z.string().min(1, strings.errors.notes).max(1000, strings.errors.notesMax),
      }),
    [strings.errors]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>({
    // 一部の環境での型ミスマッチ回避のため any キャスト
    resolver: zodResolver(schema) as unknown as Resolver<FormValues, any>,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      contactMethod: "phone",
      date: todayISO(),
      time: "",
      address: "",
      notes: "",
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [doneModal, setDoneModal] = useState<null | { name: string }>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/job/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name,
          email: v.email,
          phone: v.phone,
          message: [
            "【ご依頼フォーム】",
            `■ 連絡方法: ${
              CONTACT_METHODS.find((c) => c.key === v.contactMethod)?.label ?? v.contactMethod
            }`,
            `■ 希望日時: ${v.date} ${v.time}`,
            `■ ご住所: ${v.address}`,
            "",
            "■ ご要望・相談内容:",
            v.notes,
          ].join("\n"),
          contactMethod: v.contactMethod,
          date: v.date,
          time: v.time,
          address: v.address,
          notes: v.notes,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? "送信に失敗しました。");
        return;
      }
      reset({
        ...watch(),
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
        time: "",
        date: todayISO(),
      });
      setDoneModal({ name: v.name });
    } catch (e: any) {
      setErrorMsg(e?.message ?? "送信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const minDate = todayISO();

  const textClass = isDark ? "text-white" : "text-black";
  const cardClass = clsx(
    "rounded-2xl border shadow-sm backdrop-blur",
    isDark ? "bg-white/10 border-white/20" : "bg-white/80"
  );

  return (
    <div className={clsx("space-y-6", textClass)}>
      <div className={cardClass}>
        {/* ヘッダー＋言語切替 */}
        <div
          className={clsx(
            "px-5 pt-5 pb-3 border-b rounded-t-2xl",
            isDark ? "bg-black/20 border-white/10" : "bg-white/60 border-black/10"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquareMore className={clsx("h-5 w-5", isDark ? "text-white" : "text-black")} />
              <h2 className={clsx("text-base font-semibold", isDark ? "text-white" : "text-black")}>
                {strings.ui.sectionTitle}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className={clsx("text-xs", isDark ? "text-white/80" : "text-black/70")}>
                {strings.ui.langPickerLabel}
              </span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as LangKey)}
                className={clsx(
                  "h-8 rounded-md border px-2 text-sm",
                  isDark ? "bg-black/40 text-white border-white/20" : "bg-white text-black"
                )}
                disabled={loadingLang}
                aria-label={strings.ui.langPickerLabel}
              >
                <option value={BASE_LANG.key}>
                  {BASE_LANG.emoji} {BASE_LANG.label}
                </option>
                {LANGS.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.emoji} {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className={clsx("mt-1 text-xs", isDark ? "text-white/70" : "text-black/70")}>
            {strings.ui.sectionHelp}
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-6">
          {/* お名前 */}
          <div className="grid gap-2">
            <label className={clsx("text-sm font-medium", isDark ? "text-white" : "text-black")}>
              {strings.ui.name}
            </label>
            <Input
              placeholder={strings.ui.namePh}
              {...register("name")}
              className={isDark ? "text-black bg-white" : "text-black"}
              aria-required={true}
              required
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* 電話番号 */}
          <div className="grid gap-2">
            <label className={clsx("text-sm font-medium", isDark ? "text-white" : "text-black")}>
              {strings.ui.phone}
            </label>
            <Input
              placeholder={strings.ui.phonePh}
              {...register("phone")}
              className={isDark ? "text-black bg-white" : "text-black"}
              inputMode="tel"
              aria-required={true}
              required
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          {/* メールアドレス */}
          <div className="grid gap-2">
            <label className={clsx("text-sm font-medium", isDark ? "text-white" : "text-black")}>
              {strings.ui.email}
            </label>
            <Input
              type="email"
              placeholder={strings.ui.emailPh}
              {...register("email")}
              className={isDark ? "text-black bg-white" : "text-black"}
              inputMode="email"
              aria-required={true}
              required
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {/* 希望日・希望時間 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className={clsx("text-sm font-medium", isDark ? "text-white" : "text-black")}>
                {strings.ui.date}
              </label>
              <Input
                type="date"
                min={minDate}
                {...register("date")}
                className={isDark ? "text-black bg-white" : "text-black"}
                aria-required={true}
                required
              />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>

            <div className="grid gap-2">
              <label className={clsx("text-sm font-medium", isDark ? "text-white" : "text-black")}>
                {strings.ui.time}
              </label>
              <select
                {...register("time")}
                className={clsx("h-10 w-full rounded-md border px-3", "bg-white text-black")}
                aria-required={true}
                required
              >
                <option value="">{strings.ui.timeSelectPlaceholder}</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.time && <p className="text-xs text-red-500">{errors.time.message}</p>}
            </div>
          </div>

          {/* ご住所 */}
          <div className="grid gap-2">
            <label className={clsx("text-sm font-medium", isDark ? "text-white" : "text-black")}>
              {strings.ui.address}
            </label>
            <Input
              placeholder={strings.ui.addressPh}
              {...register("address")}
              className={isDark ? "text-black bg-white" : "text-black"}
              aria-required={true}
              required
            />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          {/* ご要望 */}
          <div className="grid gap-2">
            <label className={clsx("text-sm font-medium", isDark ? "text-white" : "text-black")}>
              {strings.ui.notes}
            </label>
            <Textarea
              rows={6}
              placeholder={strings.ui.notesPh}
              {...register("notes")}
              className={isDark ? "text-black bg-white" : "text-black"}
              aria-required={true}
              required
            />
            {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
          </div>

          {/* 送信エラー */}
          {errorMsg && (
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{errorMsg}</div>
          )}

          {/* 送信ボタン */}
          <div className="pt-2">
            <Button type="submit" disabled={submitting || loadingLang}>
              {submitting ? strings.ui.sending : strings.ui.submit}
            </Button>
          </div>
        </form>
      </div>

      {/* 成功モーダル（白背景固定） */}
      {doneModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
          <div className="w-[92%] max-w-md rounded-2xl bg-white p-6 shadow-xl text-black">
            <div className="text-base font-semibold mb-2">{strings.modal.doneTitle}</div>
            <p className="text-sm mb-4">
              {strings.modal.doneLine1(doneModal.name)}
              <br />
              {strings.modal.doneLine2}
            </p>
            <div className="text-right">
              <Button onClick={() => setDoneModal(null)}>{strings.modal.close}</Button>
            </div>
          </div>
        </div>
      )}

      {/* 言語ロード中オーバーレイ（操作はブロックしない） */}
      {loadingLang && (
        <div className="fixed inset-0 z-[999] pointer-events-none flex items-center justify-center">
          <div className="rounded bg-black/70 text-white text-sm px-3 py-1.5">
            Loading language…
          </div>
        </div>
      )}
    </div>
  );
}
