// /app/api/mail/send/route.ts
import { NextResponse } from "next/server";
import { getGmail } from "@/lib/gmail";

function encodeMessage(msg: string) {
  // Base64URL
  return Buffer.from(msg)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(req: Request) {
  try {
    const { to, subject, text } = await req.json();

    const from = process.env.GOOGLE_SENDER_EMAIL!;
    const raw =
      [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        'Content-Type: text/plain; charset="UTF-8"',
        "",
        text,
      ].join("\r\n");

    const gmail = getGmail();
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodeMessage(raw) },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("gmail send error:", e?.response?.data || e);
    return NextResponse.json(
      { ok: false, error: e?.message || "send failed" },
      { status: 500 }
    );
  }
}
