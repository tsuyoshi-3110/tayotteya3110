// Nodeランタイムで実行
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// 返却型
type RefundStatus = "none" | "requested" | "processed" | "refunded";

export async function POST(req: NextRequest) {
  try {
    const { orderId, siteKey } = (await req.json()) as {
      orderId?: string;
      siteKey?: string;
    };
    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    // Stripe の Charges 検索（metadataに orderId / siteKey を入れている前提）
    // ※ destination charge（プラットフォーム課金）なら platform 側の検索でヒットします。
    const query = siteKey
      ? `metadata['orderId']:'${orderId}' AND metadata['siteKey']:'${siteKey}'`
      : `metadata['orderId']:'${orderId}'`;

    const search = await stripe.charges.search({ query, limit: 1 });
    if (search.data.length === 0) {
      return NextResponse.json({ status: "none" satisfies RefundStatus });
    }

    const charge = search.data[0];
    const amount = charge.amount ?? 0; // 課金額（最小単位）
    const amountRefunded = charge.amount_refunded ?? 0;

    let status: RefundStatus = "none";
    if (amountRefunded > 0 && amountRefunded < amount) status = "processed"; // 一部返金
    if (amountRefunded >= amount && amount > 0) status = "refunded"; // 全額返金

    return NextResponse.json({
      status,
      amount,
      amountRefunded,
      chargeId: charge.id,
      paymentIntentId: charge.payment_intent,
    });
  } catch (e: any) {
    console.error("[refund-status] error", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
