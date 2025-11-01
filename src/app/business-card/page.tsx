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
  name: string; // ownerName
  company?: string; // siteName
  email?: string; // ownerEmail
  phone?: string; // ownerPhone
  url?: string; // QRにするURL
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

/* 住所→GoogleマップURL（LINEでタップできるように） */
function mapsUrl(addr: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    addr
  )}`;
}

/* ========== ページ本体 ========== */
export default function BusinessCardPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pageUrl = site?.baseUrl || origin || "https://example.com";

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

  const storeList: StoreItem[] = useMemo(() => {
    if (stores.length > 0) return stores;
    if (contact.ownerAddress)
      return [
        { name: contact.company, address: contact.ownerAddress, order: 0 },
      ];
    return [];
  }, [stores, contact.ownerAddress, contact.company]);

  const shareText = useMemo(
    () => buildShareText(contact, storeList),
    [contact, storeList]
  );

  const vcardText = useMemo(
    () => buildVCard(contact, storeList),
    [contact, storeList]
  );
  const vcfAnchorRef = useRef<HTMLAnchorElement | null>(null);

  const lineTextUrl = `line://msg/text/${encodeURIComponent(shareText)}`;
  const mailto = `mailto:?subject=${encodeURIComponent(
    `${contact.company ?? ""} ${contact.name ?? ""}`
  )}&body=${encodeURIComponent(shareText)}`;

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
        <Card className="shadow-xl border-0 bg-white/50">
          <CardHeader className="pb-2">
            {contact.company && (
              <p className="text-2xl font-bold leading-tight">
                {contact.company}
              </p>
            )}
            <h2 className="text-lg mt-2 leading-tight">{contact.name}</h2>
          </CardHeader>

          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 items-center">
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

                  {storeList.length > 0 && (
                    <div className="pt-2">
                      <p className="opacity-60 text-xs mb-1">拠点</p>
                      <ul className="list-disc ml-5 space-y-1">
                        {storeList.map((s, i) => (
                          <li
                            key={`${s.name ?? "store"}-${i}`}
                            className="text-sm"
                          >
                            {s.name ? (
                              <span className="font-medium">{s.name}：</span>
                            ) : null}
                            <span>{s.address}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  <a href={lineTextUrl} className="inline-block">
                    <Button variant="secondary" className="rounded-2xl">
                      LINEで送る
                    </Button>
                  </a>
                  <a href={mailto} className="inline-block">
                    <Button variant="secondary" className="rounded-2xl">
                      メールで送る
                    </Button>
                  </a>
                  <Button
                    variant="secondary"
                    onClick={handleDownloadVcf}
                    className="rounded-2xl"
                  >
                    vCardを保存
                  </Button>
                  <a ref={vcfAnchorRef} className="hidden" aria-hidden />
                </div>
              </div>

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
      const addr = s.address ?? "";
      lines.push(`・${head}${addr}`);
      if (addr) lines.push(`MAP: ${mapsUrl(addr)}`); // ← 住所の直後にGoogleマップURL
    }
  } else if (c.ownerAddress) {
    lines.push(`ADDR: ${c.ownerAddress}`);
    lines.push(`MAP: ${mapsUrl(c.ownerAddress)}`); // ← フォールバック住所にも地図リンク
  }

  if (c.url) lines.push(`URL: ${c.url}`);
  return lines.join("\n");
}

function escVCard(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
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
          .map(
            (s) =>
              `ADR;TYPE=WORK${
                s.name ? `;LABEL=${escVCard(s.name)}` : ""
              }:;;${escVCard(s.address!)};;;;`
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
