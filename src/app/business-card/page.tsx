// app/business-card/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code"; // npm i react-qr-code
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { site } from "@/config/site";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";

/* ========== 型 ========== */
type Contact = {
  name: string;        // ownerName
  company?: string;    // siteName
  email?: string;      // ownerEmail
  phone?: string;      // ownerPhone
  address?: string;    // ownerAddress
  url?: string;        // QRにするURL
};

type SiteDoc = Partial<{
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerAddress: string;
  siteName: string;
}> | null;

/* ========== 共有テキストの生成（役職なし／会社→改行→氏名） ========== */
function makeShareText(c: Contact) {
  return [
    c.company ?? "",          // 1行目: 会社名（siteName）
    c.name ?? "",             // 2行目: 氏名（ownerName）
    c.phone && `TEL: ${c.phone}`,
    c.email && `MAIL: ${c.email}`,
    c.address && `ADDR: ${c.address}`,
    c.url && `URL: ${c.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ========== ページ本体 ========== */
export default function BusinessCardPage() {
  // QR用URL（NEXT_PUBLIC_APP_URLがあればそれ、無ければ現在オリジン）
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pageUrl = site?.baseUrl || origin || "https://example.com";

  // Firestore: Editable と Base を同時購読し、Editable を優先してマージ
  const [editable, setEditable] = useState<SiteDoc>(null);
  const [base, setBase] = useState<SiteDoc>(null);

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
    return () => {
      unsubEditable();
      unsubBase();
    };
  }, []);

  // マージ（Editable > Base > 既定値）
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
      address: str(e.ownerAddress ?? b.ownerAddress).trim(),
      url: pageUrl,
    };
  }, [editable, base, pageUrl]);

  const vcardText = useMemo(() => buildVCard(contact), [contact]);
  const vcfAnchorRef = useRef<HTMLAnchorElement | null>(null);

  // Web Share対応可否（UI制御用）
  const canWebShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  // 共有（Web Share API）: 例外でも必ずフォールバック
  const handleShare = async () => {
    const text = makeShareText(contact);
    const shareBase = {
      title: `${contact.company ?? ""} | ${contact.name ?? ""}`,
      text, // ← 会社名→改行→氏名→連絡先を含む
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
      // 例外（Permission denied含む）→ クリップボード or LINEへ
      try {
        await navigator.clipboard.writeText(text);
        alert("この端末では共有シートが使えないため、名刺テキストをコピーしました。LINEやメールに貼り付けてください。");
      } catch {
        window.open(
          `https://line.me/R/msg/text/?${encodeURIComponent(text)}`,
          "_blank"
        );
      }
    }
  };

  // テキスト付き LINE / メール リンク
  const shareText = makeShareText(contact);
  const lineShareTextUrl = `https://line.me/R/msg/text/?${encodeURIComponent(
    shareText
  )}`;
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
            {/* 見た目も会社→改行→氏名 */}
            {contact.company && (
              <p className="text-xl font-bold ">{contact.company}</p>
            )}
            <h2 className="text-md leading-tight">{contact.name}</h2>
          </CardHeader>

          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              {/* 左: 名刺テキスト */}
              <div className="space-y-3">
                <div className="pt-2 text-sm space-y-1">
                  {contact.phone && (
                    <p>
                      <span className="inline-block w-14 opacity-60">TEL</span>
                      <a
                        href={`tel:${contact.phone}`}
                        className="underline underline-offset-2"
                      >
                        {contact.phone}
                      </a>
                    </p>
                  )}
                  {contact.email && (
                    <p>
                      <span className="inline-block w-14 opacity-60">MAIL</span>
                      <a
                        href={`mailto:${contact.email}`}
                        className="underline underline-offset-2"
                      >
                        {contact.email}
                      </a>
                    </p>
                  )}
                  <p>
                    <span className="inline-block w-14 opacity-60">WEB</span>
                    <a
                      href={contact.url}
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      {contact.url}
                    </a>
                  </p>
                  {contact.address && (
                    <p>
                      <span className="inline-block w-14 opacity-60">ADDR</span>
                      <span>{contact.address}</span>
                    </p>
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

                  {/* テキスト付きLINE共有 */}
                  <a href={lineShareTextUrl} target="_blank" className="inline-block">
                    <Button variant="secondary" className="rounded-2xl">
                      LINEで送る（テキスト）
                    </Button>
                  </a>

                  {/* メール：本文に名刺テキスト */}
                  <a href={mailto} className="inline-block">
                    <Button variant="secondary" className="rounded-2xl">
                      メールで送る
                    </Button>
                  </a>

                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="rounded-2xl"
                  >
                    リンクをコピー
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDownloadVcf}
                    className="rounded-2xl"
                  >
                    vCardを保存（.vcf）
                  </Button>
                  <a ref={vcfAnchorRef} className="hidden" aria-hidden />
                </div>
              </div>

              {/* 右: QRコード */}
              <div className="flex flex-col items-center justify-center gap-4 py-6">
                <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl shadow">
                  <QRCode value={contact.url ?? pageUrl} size={196} />
                </div>
                <p className="text-sm text-muted-foreground text-center">URL</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ========== vCard 生成（役職行なし） ========== */
function buildVCard(c: Contact) {
  const displayName = c.name || "";
  const [last, first] = displayName.includes(" ")
    ? displayName.split(" ")
    : [displayName, ""];
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${displayName}`,
    c.company ? `ORG:${c.company}` : "",
    c.phone ? `TEL;TYPE=CELL,VOICE:${c.phone}` : "",
    c.email ? `EMAIL;TYPE=INTERNET:${c.email}` : "",
    c.url ? `URL:${c.url}` : "",
    c.address ? `ADR;TYPE=WORK:;;${c.address};;;;` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}
