// app/api/vcard/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { SITE_KEY } from "@/lib/atoms/siteKeyAtom";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

function esc(text: string) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function buildVCard(opts: {
  ownerName: string;
  siteName: string;
  phone?: string;
  email?: string;
  address?: string;
  url?: string;
}) {
  const displayName = opts.ownerName || opts.siteName || "Contact";
  const [last, first] = displayName.includes(" ")
    ? displayName.split(" ")
    : [displayName, ""];

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(displayName)}`,
    opts.siteName ? `ORG:${esc(opts.siteName)}` : "",
    opts.phone ? `TEL;TYPE=CELL,VOICE:${esc(opts.phone)}` : "",
    opts.email ? `EMAIL;TYPE=INTERNET:${esc(opts.email)}` : "",
    opts.url ? `URL:${esc(opts.url)}` : "",
    opts.address ? `ADR;TYPE=WORK:;;${esc(opts.address)};;;;` : "",
    "END:VCARD",
  ].filter(Boolean);

  // vCardはCRLFが相性良い
  return lines.join("\r\n");
}

export async function GET() {
  // Editable優先 → Baseフォールバック（“一般向け”想定）
  const [eSnap, bSnap] = await Promise.all([
    adminDb.doc(`siteSettingsEditable/${SITE_KEY}`).get(),
    adminDb.doc(`siteSettings/${SITE_KEY}`).get(),
  ]);
  const e = (eSnap.exists ? (eSnap.data() as any) : {}) || {};
  const b = (bSnap.exists ? (bSnap.data() as any) : {}) || {};

  const ownerName = (e.ownerName ?? b.ownerName ?? "").trim();
  const siteName = (e.siteName ?? b.siteName ?? site.name ?? "Pageit").trim();
  const phone = (e.ownerPhone ?? b.ownerPhone ?? "").trim();
  const email = (e.ownerEmail ?? b.ownerEmail ?? "").trim();
  const address = (e.ownerAddress ?? b.ownerAddress ?? "").trim();
  const url = site.baseUrl;

  const vcf = buildVCard({ ownerName, siteName, phone, email, address, url });

  const filenameBase = ownerName || siteName || "contact";
  const filename = `${encodeURIComponent(filenameBase)}.vcf`;

  return new NextResponse(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
