// components/company/CompanyOverview.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import CardSpinner from "@/components/CardSpinner";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import {
  Wand2,
  Building2,
  MapPin,
  Link as LinkIcon,
  User as UserIcon,
  Phone,
  Mail,
  Calendar,
  Users,
  Globe,
  Sparkles,
} from "lucide-react";

import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

/* ========= Types ========= */
type CompanyProfile = {
  name: string; // ✅ 最低限の必須
  tagline?: string;
  about?: string;
  founded?: string;
  ceo?: string;
  capital?: string;
  employees?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  business?: string[]; // 事業内容（配列）※空文字も保持して改行を表現
  mapEmbedUrl?: string; // Google マップ埋め込みURL（任意 or 自動生成）
  updatedAt?: any;
  updatedByUid?: string | null;
  updatedByName?: string | null;
};

const EMPTY: CompanyProfile = {
  name: "",
  tagline: "",
  about: "",
  founded: "",
  ceo: "",
  capital: "",
  employees: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  business: [],
  mapEmbedUrl: "",
};

/* ========= Utils ========= */
// 空行も末尾改行も保持
function linesToArrayPreserve(s: string) {
  return s.split("\n");
}
function arrayToLinesPreserve(a?: string[]) {
  return (a ?? []).join("\n");
}

/**
 * すでに正しい embed URL ならそのまま返し、
 * それ以外（住所・通常URL・短縮URL等）は q= に詰めて output=embed へ変換
 * ※ NEXT_PUBLIC_MAPS_EMBED_KEY があれば v1/place を使用（任意）
 */
function buildSimpleEmbedSrc(input?: string) {
  const s = (input ?? "").trim();
  if (!s) return undefined;

  // すでに埋め込み形式
  if (/^https?:\/\/www\.google\.[^/]+\/maps\/embed\/?/i.test(s)) {
    return s;
  }

  // 公式 Embed API（任意：キーを公開側変数で設定している場合のみ）
  const key = process.env.NEXT_PUBLIC_MAPS_EMBED_KEY;
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(
      s
    )}`;
  }

  // キーなしの簡易埋め込み
  return `https://www.google.com/maps?q=${encodeURIComponent(s)}&output=embed`;
}

/** CompanyProfile から埋め込みURLを決定（mapEmbedUrl 優先、なければ address → name） */
function computeMapEmbedSrc(data: CompanyProfile) {
  return (
    buildSimpleEmbedSrc(data.mapEmbedUrl) ||
    buildSimpleEmbedSrc(data.address) ||
    buildSimpleEmbedSrc(data.name)
  );
}

/* ========= AI生成モーダル ========= */
type AiTarget = "about" | "business";

type AiContext = {
  companyName?: string;
  tagline?: string;
  location?: string;
  audience?: string;
  industryHint?: string;
  existingAbout?: string;
  existingBusiness?: string[];
};

function AiGenerateModal({
  open,
  onClose,
  onGenerate,
  target,
  context,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (result: { about?: string; business?: string[] }) => void;
  target: AiTarget;
  context?: AiContext;
}) {
  const [k1, setK1] = useState("");
  const [k2, setK2] = useState("");
  const [k3, setK3] = useState("");
  const [loading, setLoading] = useState(false);

  const canStart = [k1, k2, k3].some((v) => v.trim().length > 0);

  useEffect(() => {
    if (!open) {
      setK1("");
      setK2("");
      setK3("");
      setLoading(false);
    }
  }, [open]);

  const start = async () => {
    if (!canStart) return;
    setLoading(true);
    const keywords = [k1, k2, k3].map((v) => v.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/ai/generate-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          target,
          keywords,
          temperature: 0.85,
          seed: Date.now() + Math.random(),
          ...context, // 文脈を同梱
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onGenerate({
          about: typeof data.about === "string" ? data.about : undefined,
          business: Array.isArray(data.business) ? data.business : undefined,
        });
      } else {
        // フォールバック生成（簡易）
        if (target === "about") {
          const text =
            `私たちは${keywords.join("・") || "コア領域"}に強みを持ち、` +
            `実装と運用まで伴走しながら価値を継続提供します。`;
          onGenerate({ about: text });
        } else {
          const arr =
            keywords.length > 0
              ? keywords.map((k) => `${k} に関するサービス提供`)
              : ["主要事業の提供", "周辺領域サポート", "運用・改善の伴走"];
          onGenerate({ business: arr });
        }
      }
    } catch (e) {
      console.error(e);
      if (target === "about") {
        onGenerate({
          about:
            "【会社情報】お客様の課題に寄り添い、現場起点の実装と運用で成果にこだわります。",
        });
      } else {
        onGenerate({ business: ["主要サービスA", "主要サービスB"] });
      }
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white/90 shadow-2xl border border-white/40 ring-1 ring-black/5">
        <div className="p-5 border-b bg-gradient-to-r from-purple-600/10 to-fuchsia-600/10">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600" />
            {target === "about" ? "会社説明をAIで生成" : "事業内容をAIで生成"}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            キーワードを最大3つまで入力（1つ以上で開始可能）
          </p>
        </div>

        <div className="p-5 space-y-3">
          <Input
            value={k1}
            onChange={(e) => setK1(e.target.value)}
            placeholder="キーワード1（例：動画制作／地域密着 など）"
          />
          <Input
            value={k2}
            onChange={(e) => setK2(e.target.value)}
            placeholder="キーワード2（任意）"
          />
          <Input
            value={k3}
            onChange={(e) => setK3(e.target.value)}
            placeholder="キーワード3（任意）"
          />
        </div>

        <div className="p-5 pt-0 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            onClick={start}
            disabled={!canStart || loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? "生成中..." : "生成開始"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ========= Main ========= */
export default function CompanyOverview() {
  const db = useMemo(() => getFirestore(), []);
  const auth = useMemo(() => getAuth(), []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<CompanyProfile>(EMPTY);
  const [edit, setEdit] = useState<CompanyProfile>(EMPTY);
  const [isEditing, setIsEditing] = useState(false);

  // モーダル制御
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<AiTarget>("about");

  // ログイン監視
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, [auth]);

  // 初期ロード
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const ref = doc(db, "siteMeta", SITE_KEY, "company", "profile");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as CompanyProfile;
          setProfile({ ...EMPTY, ...data });
        } else {
          setProfile(EMPTY);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [db]);

  // 編集開始/取消
  const startEdit = () => {
    setEdit(profile);
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setIsEditing(false);
    setEdit(profile);
  };

  // 保存（✅ 必須は name のみ）
  const saveEdit = async () => {
    if (!edit.name.trim()) {
      alert("会社名は必須です。");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "siteMeta", SITE_KEY, "company", "profile");
      const payload: CompanyProfile = {
        ...edit,
        // そのまま保持：空行も末尾改行も反映される
        business: edit.business,
        updatedAt: serverTimestamp(),
        updatedByUid: user?.uid ?? null,
        updatedByName: user?.displayName ?? null,
      };
      await setDoc(ref, payload, { merge: true });
      setProfile(payload);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました。権限またはネットワークをご確認ください。");
    } finally {
      setSaving(false);
    }
  };

  const canEdit = !!user;

  // AI結果の反映
  const applyAiResult = useCallback(
    (result: { about?: string; business?: string[] }) => {
      if (result.about != null) {
        setEdit((prev) => ({ ...prev, about: result.about ?? "" }));
      }
      if (result.business != null) {
        setEdit((prev) => ({ ...prev, business: result.business ?? [] }));
      }
    },
    []
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* ゴージャス感：柔らかいグラス＋微グラデ輪郭 */}
      <div className="relative rounded-3xl bg-white/60 backdrop-blur-md shadow-xl border border-white/50 ring-1 ring-black/5 p-0 overflow-hidden">
        {(loading || saving) && <CardSpinner />}

        {/* ヘッダー帯 */}
        <div className="px-6 md:px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  会社概要
                </h1>
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button
                    onClick={startEdit}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-400"
                  >
                    編集
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={saveEdit}
                      disabled={saving}
                      className="bg-blue-500 hover:bg-blue-400"
                    >
                      保存
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 本体 */}
        <div className="p-6 md:p-8">
          {!isEditing ? (
            <ReadOnlyView data={profile} />
          ) : (
            <EditView
              data={edit}
              onChange={setEdit}
              onOpenAi={(target) => {
                setAiTarget(target);
                setAiOpen(true);
              }}
            />
          )}
        </div>
      </div>

      {/* AIモーダル（文脈を渡す） */}
      <AiGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerate={applyAiResult}
        target={aiTarget}
        context={{
          companyName: edit.name,
          tagline: edit.tagline,
          location: edit.address,
          existingAbout: edit.about,
          existingBusiness: edit.business,
        }}
      />
    </div>
  );
}

/* ===================== ReadOnly ===================== */
function ReadOnlyView({ data }: { data: CompanyProfile }) {
  const embedSrc = computeMapEmbedSrc(data);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl md:text-2xl font-semibold">
          {data.name || "（会社名未設定）"}
        </h2>
        {data.tagline && <p className="text-gray-600 mt-1">{data.tagline}</p>}
      </section>

      {data.about && (
        <section className="rounded-2xl border border-gray-200 p-4 md:p-5 bg-white/70 mb-5">
          <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-purple-600" />
            会社情報
          </h3>
          <p className="whitespace-pre-wrap text-gray-800">{data.about}</p>
        </section>
      )}

      <section className="grid md:grid-cols-2 gap-6 mb-5">
        <Field
          icon={<UserIcon className="h-4 w-4" />}
          label="代表者"
          value={data.ceo}
        />
        <Field
          icon={<Calendar className="h-4 w-4" />}
          label="設立"
          value={data.founded}
        />
        <Field
          icon={<Sparkles className="h-4 w-4" />}
          label="資本金"
          value={data.capital}
        />
        <Field
          icon={<Users className="h-4 w-4" />}
          label="従業員数"
          value={data.employees}
        />
        <Field
          icon={<MapPin className="h-4 w-4" />}
          label="所在地"
          value={data.address}
        />
        <Field
          icon={<Phone className="h-4 w-4" />}
          label="電話番号"
          value={data.phone}
        />
        <Field
          icon={<Mail className="h-4 w-4" />}
          label="メール"
          value={data.email}
        />
        <Field
          icon={<Globe className="h-4 w-4" />}
          label="Webサイト"
          value={data.website}
          isLink
        />
      </section>

      {Array.isArray(data.business) && data.business.length > 0 && (
        <section className="rounded-2xl border border-gray-200 p-4 md:p-5 bg-white/70">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            事業内容
          </h3>
          {/* 空文字はリストでは非表示（見た目の空行は不要なので除外） */}
          <ul className="list-disc pl-5 space-y-1">
            {data.business
              .filter((b) => (b ?? "").trim() !== "")
              .map((b, i) => (
                <li key={i} className="text-gray-800">
                  {b}
                </li>
              ))}
          </ul>
        </section>
      )}

      {embedSrc && (
        <section className="rounded-2xl overflow-hidden border border-gray-200 bg-white/70">
          <h3 className="font-medium text-gray-700 mb-2 p-4 flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-blue-600" />
            アクセス
          </h3>
          <div className="aspect-video w-full">
            <iframe
              src={embedSrc}
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  isLink,
  icon,
}: {
  label: string;
  value?: string;
  isLink?: boolean;
  icon?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white/70">
      <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
        {icon}
        {label}
      </div>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-blue-700 underline break-all"
        >
          {value}
        </a>
      ) : (
        <div className="text-gray-900 break-words whitespace-pre-wrap">
          {value}
        </div>
      )}
    </div>
  );
}

/* ===================== Edit ===================== */
function EditView({
  data,
  onChange,
  onOpenAi,
}: {
  data: CompanyProfile;
  onChange: (v: CompanyProfile) => void;
  onOpenAi: (target: AiTarget) => void;
}) {
  const previewSrc = computeMapEmbedSrc(data);

  return (
    <div className="space-y-8">
      {/* 必須は会社名のみ */}
      <div className="grid md:grid-cols-2 gap-4">
        <LabeledInput
          label="会社名 *"
          value={data.name}
          onChange={(v) => onChange({ ...data, name: v })}
        />
        <LabeledInput
          label="タグライン / キャッチコピー（任意）"
          value={data.tagline ?? ""}
          onChange={(v) => onChange({ ...data, tagline: v })}
        />
      </div>

      {/* 会社説明 + AI */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-gray-600">会社説明（任意）</div>
          <Button
            onClick={() => onOpenAi("about")}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Wand2 className="h-4 w-4 mr-1" />
            AIで生成
          </Button>
        </div>
        <Textarea
          value={data.about ?? ""}
          onChange={(e) => onChange({ ...data, about: e.target.value })}
          rows={6}
          placeholder="会社の特徴・強み・提供価値などを記載（未入力可）"
          className="bg-white/80"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <LabeledInput
          label="代表者（任意）"
          value={data.ceo ?? ""}
          onChange={(v) => onChange({ ...data, ceo: v })}
        />
        <LabeledInput
          label="設立（任意）"
          value={data.founded ?? ""}
          onChange={(v) => onChange({ ...data, founded: v })}
          placeholder="例: 2012-04-01"
        />
        <LabeledInput
          label="資本金（任意）"
          value={data.capital ?? ""}
          onChange={(v) => onChange({ ...data, capital: v })}
        />
        <LabeledInput
          label="従業員数（任意）"
          value={data.employees ?? ""}
          onChange={(v) => onChange({ ...data, employees: v })}
        />
        <LabeledInput
          label="所在地（任意）"
          value={data.address ?? ""}
          onChange={(v) => onChange({ ...data, address: v })}
        />
        <LabeledInput
          label="電話番号（任意）"
          value={data.phone ?? ""}
          onChange={(v) => onChange({ ...data, phone: v })}
        />
        <LabeledInput
          label="メール（任意）"
          value={data.email ?? ""}
          onChange={(v) => onChange({ ...data, email: v })}
        />
        <LabeledInput
          label="Webサイト（任意）"
          value={data.website ?? ""}
          onChange={(v) => onChange({ ...data, website: v })}
          placeholder="https://example.com"
        />
      </div>

      {/* 事業内容 + AI（空行・末尾改行を保持） */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-gray-600">
            事業内容（任意・1行につき1項目 / 空行OK）
          </div>
        </div>
        <Textarea
          value={arrayToLinesPreserve(data.business)}
          onChange={(e) =>
            onChange({
              ...data,
              business: linesToArrayPreserve(e.target.value),
            })
          }
          rows={8}
          placeholder={
            "例：\n動画撮影・編集\n\nWebサイト制作（CMS）\n運用サポート\n"
          }
          className="bg-white/80"
        />
        <p className="text-xs text-gray-500">
          ※ Enter
          での空行や、最後の改行も保持されます（閲覧表示では空行は表示されません）。
        </p>
      </div>

      {/* Googleマップ：住所から自動生成 & ライブプレビュー */}
      <div>
        <LabeledInput
          label="Googleマップ埋め込みURL（任意）"
          value={data.mapEmbedUrl ?? ""}
          onChange={(v) => onChange({ ...data, mapEmbedUrl: v })}
          placeholder="https://www.google.com/maps/embed?..."
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">
            ※
            短縮URL（maps.app.goo.gl）や通常URLでもOK。自動で埋め込み形式に変換します。
          </span>
        </div>

        {/* ライブプレビュー */}
        {previewSrc && (
          <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg border">
            <iframe
              src={previewSrc}
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-gray-600">{label}</div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white/80"
      />
    </label>
  );
}
