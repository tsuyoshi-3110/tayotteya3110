// app/business-card/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { site } from "@/config/site";
import { db } from "@/lib/firebase";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import {
  collection,
  doc,
  onSnapshot,
  QueryDocumentSnapshot,
} from "firebase/firestore";

/* ========== 型 ========== */
type Contact = {
  name: string;          // ownerName
  company?: string;      // siteName
  email?: string;        // ownerEmail
  phone?: string;        // ownerPhone
  url?: string;          // QRにするURL
  ownerAddress?: string; // siteSettings の住所（拠点が無い時のフォールバック）
};

type SiteDoc = Partial<{
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerAddress: string;
  siteName: string;
}> | null;

type StoreItem = {
  name?: string;
  address?: string;
  order?: number;
};

function readStore(s: QueryDocumentSnapshot): StoreItem {
  const d = s.data() as any;
  return {
    name: typeof d?.name === "string" ? d.name : undefined,
    address: typeof d?.address === "string" ? d.address : undefined,
    order: typeof d?.order === "number" ? d.order : 9_999,
  };
}

/* ========== ページ本体 ========== */
export default function BusinessCardPage() {
  // QR用URL（NEXT_PUBLIC_APP_URLがあればそれ、無ければ現在オリジン）
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pageUrl = site?.baseUrl || origin || "https://example.com";

  // Firestore: Editable / Base / Stores を購読（Editableを優先）
  const [editable, setEditable] = useState<SiteDoc>(null);
  const [base, setBase] = useState<SiteDoc>(null);
  const [stores, setStores] = useState<StoreItem[]>([]);

  useEffect(() => {
    const unsubEditable = onSnapshot(
      doc(db, "siteSettingsEditable", SITE_KEY),
      (s) => setEditable(s.exists() ? (s.data() as SiteDoc) : null),
      (e) => console.warn("siteSettingsEditable read error:", e)
    );
    const unsubBase = onSnapshot(
      doc(db, "siteSettings", SITE_KEY),
      (s) => setBase(s.exists() ? (s.data() as SiteDoc) : null),
      (e) => console.warn("siteSettings read error:", e)
    );
    const unsubStores = onSnapshot(
      collection(db, "siteStores", SITE_KEY, "items"),
      (snap) => {
        const arr = snap.docs
          .map(readStore)
          .filter((x) => x.address || x.name)
          .sort(
            (a, b) =>
              (a.order ?? 9_999) - (b.order ?? 9_999) ||
              (a.name ?? "").localeCompare(b.name ?? "", "ja")
          );
        setStores(arr);
      },
      (e) => console.warn("siteStores read error:", e)
    );

    return () => {
      unsubEditable();
      unsubBase();
      unsubStores();
    };
  }, []);

  // マージ（Editable > Base）
  const contact: Contact = useMemo(() => {
    const e = editable ?? {};
    const b = base ?? {};
    const str = (v: any, def = "") =>
      typeof v === "string" ? v : v == null ? def : String(v);
    return {
      name: str(e.ownerName ?? b.ownerName, "－").trim(),
      company: str(e.siteName ?? b.siteName ?? site?.name ?? "Pageit").trim(),
      email: str(e.ownerEmail ?? b.ownerEmail).trim(),
      phone: str(e.ownerPhone ?? b.ownerPhone).trim(),
      url: pageUrl,
      ownerAddress: str(e.ownerAddress ?? b.ownerAddress).trim(),
    };
  }, [editable, base, pageUrl]);

  // 拠点一覧（siteStores があればそれを使い、無ければ ownerAddress を1件化）
  const storeList: StoreItem[] = useMemo(() => {
    if (stores.length > 0) return stores;
    if (contact.ownerAddress) return [{ name: contact.company, address: contact.ownerAddress, order: 0 }];
    return [];
  }, [stores, contact.ownerAddress, contact.company]);

  // 共有用テキスト
  const shareText = useMemo(
    () => buildShareText(contact, storeList),
    [contact, storeList]
  );

  // vCard
  const vcardText = useMemo(
    () => buildVCard(contact, storeList),
    [contact, storeList]
  );
  const vcfAnchorRef = useRef<HTMLAnchorElement | null>(null);

  // Web Share対応可否（UI制御用）
  const canWebShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  // 共有（Web Share API）: 例外でも必ずフォールバック
  const handleShare = async () => {
    const shareBase = {
      title: `${contact.company ?? ""} | ${contact.name ?? ""}`,
      text: shareText,
      url: contact.url,
    } as ShareData;

    const navAny = navigator as any;
    const vcf = new File([vcardText], `${contact.name || "contact"}.vcf`, {
      type: "text/vcard",
    });
    const canShareFiles =
      !!navAny?.canShare && navAny.canShare({ files: [vcf] });

    try {
      if (canShareFiles) {
        await navAny.share({ ...shareBase, files: [vcf] });
        return;
      }
      if (navigator.share) {
        await navigator.share(shareBase);
        return;
      }
      throw new Error("share-not-supported");
    } catch {
      // フォールバック：クリップボードへコピー
      try {
        await navigator.clipboard.writeText(shareText);
        alert("共有シートが使えないため、名刺情報をコピーしました。LINEやメールに貼り付けてください。");
      } catch {
        // それでも無理なら URL だけ LINE プラグインへ
        window.open(
          `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
            contact.url ?? pageUrl
          )}`,
          "_blank"
        );
      }
    }
  };

  // LINE（テキスト）・メール（本文）リンク
  const lineTextUrl = `line://msg/text/${encodeURIComponent(shareText)}`; // スマホ専用
  const mailto = `mailto:?subject=${encodeURIComponent(
    `${contact.company ?? ""} ${contact.name ?? ""}`
  )}&body=${encodeURIComponent(shareText)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contact.url ?? pageUrl);
    alert("リンクをコピーしました。");
  };

  const handleDownloadVcf = () => {
    const blob = new Blob([vcardText], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    if (!vcfAnchorRef.current) return;
    vcfAnchorRef.current.href = url;
    vcfAnchorRef.current.download = `${contact.name || "contact"}.vcf`;
    vcfAnchorRef.current.click();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b mt-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto max-w-3xl p-6">
        <Card className="shadow-xl border-0">
          <CardHeader className="pb-2">
            {/* 会社名と氏名は段落で分ける（役職は出さない） */}
            {contact.company && (
              <p className="text-2xl font-bold leading-tight">{contact.company}</p>
            )}
            <h2 className="text-lg mt-2 leading-tight">{contact.name}</h2>
          </CardHeader>

          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              {/* 左: テキスト */}
              <div className="space-y-3">
                <div className="pt-2 text-sm space-y-1">
                  {contact.phone && (
                    <p>
                      <span className="inline-block w-14 opacity-60">TEL</span>
                      <a href={`tel:${contact.phone}`} className="underline underline-offset-2">
                        {contact.phone}
                      </a>
                    </p>
                  )}
                  {contact.email && (
                    <p>
                      <span className="inline-block w-14 opacity-60">MAIL</span>
                      <a href={`mailto:${contact.email}`} className="underline underline-offset-2">
                        {contact.email}
                      </a>
                    </p>
                  )}
                  <p>
                    <span className="inline-block w-14 opacity-60">WEB</span>
                    <a href={contact.url} target="_blank" className="underline underline-offset-2">
                      {contact.url}
                    </a>
                  </p>

                  {/* 拠点一覧（複数対応） */}
                  {storeList.length > 0 && (
                    <div className="pt-2">
                      <p className="opacity-60 text-xs mb-1">拠点</p>
                      <ul className="list-disc ml-5 space-y-1">
                        {storeList.map((s, i) => (
                          <li key={`${s.name ?? "store"}-${i}`} className="text-sm">
                            {s.name ? <span className="font-medium">{s.name}：</span> : null}
                            <span>{s.address}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  <Button
                    onClick={handleShare}
                    disabled={!canWebShare}
                    className="rounded-2xl px-4 py-5"
                  >
                    共有（AirDrop / LINE / メール）
                  </Button>

                  {/* スマホの LINE アプリに “テキスト” を直接送る */}
                  <a href={lineTextUrl} className="inline-block">
                    <Button variant="secondary" className="rounded-2xl">
                      LINEで送る（テキスト）
                    </Button>
                  </a>

                  {/* メール本文に “テキスト” を入れる */}
                  <a href={mailto} className="inline-block">
                    <Button variant="secondary" className="rounded-2xl">
                      メールで送る（テキスト）
                    </Button>
                  </a>

                  <Button variant="outline" onClick={handleCopy} className="rounded-2xl">
                    リンクをコピー
                  </Button>

                  <Button variant="ghost" onClick={handleDownloadVcf} className="rounded-2xl">
                    vCardを保存（.vcf）
                  </Button>
                  <a ref={vcfAnchorRef} className="hidden" aria-hidden />
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  ※ Web Share API は HTTPS 環境の iOS Safari / Android Chrome などで動作します。
                  「LINEで送る（テキスト）」はスマホ専用リンクです（デスクトップでは動作しない場合があります）。
                </p>
              </div>

              {/* 右: QRコード */}
              <div className="flex flex-col items-center justify-center gap-4 py-6">
                <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl shadow">
                  <QRCode value={contact.url ?? pageUrl} size={196} />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  あなたの Pageit URL を QR に変換しています。<br />
                  カメラで読み取ってもらえば、そのままサイトへアクセスできます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ========== 共有テキスト / vCard 生成 ========== */
function buildShareText(c: Contact, stores: StoreItem[]) {
  const lines: string[] = [];
  if (c.company) lines.push(c.company);
  if (c.name) lines.push(c.name);

  if (c.phone) lines.push(`TEL: ${c.phone}`);
  if (c.email) lines.push(`MAIL: ${c.email}`);

  if (stores.length > 0) {
    lines.push("拠点:");
    for (const s of stores) {
      if (!s.address && !s.name) continue;
      const head = s.name ? `${s.name}: ` : "";
      lines.push(`・${head}${s.address ?? ""}`);
    }
  } else if (c.ownerAddress) {
    lines.push(`ADDR: ${c.ownerAddress}`);
  }

  if (c.url) lines.push(`URL: ${c.url}`);
  return lines.join("\n");
}

function escVCard(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function buildVCard(c: Contact, stores: StoreItem[]) {
  const displayName = c.name || "";
  const [last, first] = displayName.includes(" ")
    ? displayName.split(" ")
    : [displayName, ""];
  const adrLines: string[] =
    stores.length > 0
      ? stores
          .filter((s) => s.address)
          .map((s) =>
            `ADR;TYPE=WORK${s.name ? `;LABEL=${escVCard(s.name)}` : ""}:;;${escVCard(
              s.address!
            )};;;;`
          )
      : c.ownerAddress
      ? [`ADR;TYPE=WORK:;;${escVCard(c.ownerAddress)};;;;`]
      : [];

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escVCard(last)};${escVCard(first)};;;`,
    `FN:${escVCard(displayName)}`,
    c.company ? `ORG:${escVCard(c.company)}` : "",
    c.phone ? `TEL;TYPE=CELL,VOICE:${escVCard(c.phone)}` : "",
    c.email ? `EMAIL;TYPE=INTERNET:${escVCard(c.email)}` : "",
    c.url ? `URL:${escVCard(c.url)}` : "",
    ...adrLines,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}
