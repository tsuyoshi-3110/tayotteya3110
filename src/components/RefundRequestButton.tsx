"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

type OrderItem = { name: string; qty: number; unitAmount: number };
type RefundStatus = "none" | "requested" | "processed" | "refunded";

export default function RefundRequestButton({
  siteKey,
  orderId,
  item,
  customerName,
  customerEmail,
  customerPhone,
  addressText,
  // 親が渡せる場合はここで上書き
  refundStatus,
}: {
  siteKey: string;
  orderId: string;
  item: OrderItem;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  addressText?: string;
  refundStatus?: RefundStatus;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // ▼ 表示サイズを統一（高さ: 32px / 最小幅: 96px）
  const BTN_BASE =
    "ml-2 inline-flex items-center justify-center rounded border px-3 text-xs h-8 min-w-[96px] whitespace-nowrap";

  // ▼ Stripe 実態からの自動判定（初期表示で一度だけ）
  const [remoteStatus, setRemoteStatus] = useState<RefundStatus | null>(null);
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/refund-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, siteKey }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!aborted && json?.status) {
          setRemoteStatus(json.status as RefundStatus);
        }
      } catch {
        // 失敗してもUXを阻害しない（通常ボタン表示）
      }
    })();
    return () => {
      aborted = true;
    };
  }, [orderId, siteKey]);

  // ▼ 表示用の最終ステータス（Stripe実態 > 親からの渡し値 > 既定）
  const effectiveStatus: RefundStatus = remoteStatus ?? refundStatus ?? "none";
  const isFullyRefunded = effectiveStatus === "refunded";
  const isPartiallyRefunded = effectiveStatus === "processed";
  const isRequested = effectiveStatus === "requested";

  async function handleClick() {
    if (sending || sent || isFullyRefunded || isPartiallyRefunded || isRequested) return;

    const ok = confirm("この商品について返金依頼を送信します。よろしいですか？");
    if (!ok) return;

    const reason = prompt("返金理由（任意）を入力してください：") ?? "";

    setSending(true);
    try {
      const uid = auth.currentUser?.uid ?? null;

      // 1) Firestore に保存
      const docRef = await addDoc(collection(db, "transferLogs"), {
        type: "refundRequest",
        siteKey,
        orderId,
        item, // { name, qty, unitAmount }
        customer: {
          name: customerName || null,
          email: customerEmail || null,
          phone: customerPhone || null,
          addressText: addressText || null,
        },
        requestedByUid: uid,
        status: "requested", // 管理側で processed / refunded / declined 等に更新
        reason: reason.trim() || null,
        createdAt: serverTimestamp(),
      });

      // 2) 通知APIを呼ぶ（docId から内容取得してメール送信）
      let notified = false;
      try {
        const res = await fetch("/api/refund-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ docId: docRef.id }),
        });
        if (res.ok) notified = true;
      } catch {
        // noop（下のアラートで案内）
      }

      setSent(true);
      alert(
        notified
          ? "返金依頼を送信しました。管理側に通知されました。"
          : "返金依頼は保存されましたが、通知に失敗しました。時間をおいて再度お試しください。"
      );
    } catch (e) {
      console.error(e);
      alert("送信に失敗しました。通信状態を確認してください。");
    } finally {
      setSending(false);
    }
  }

  // ▼ 返金済み（全額）
  if (isFullyRefunded) {
    return (
      <span className={`${BTN_BASE} bg-gray-200 text-gray-600 cursor-default`} title="返金済み（全額）">
        返金済み
      </span>
    );
  }

  // ▼ 一部返金
  if (isPartiallyRefunded) {
    return (
      <span className={`${BTN_BASE} bg-gray-200 text-gray-600 cursor-default`} title="一部返金済み">
        一部返金
      </span>
    );
  }

  // ▼ 依頼済み（サーバーステータス） or 今回送信済み
  if (isRequested || sent) {
    return (
      <span className={`${BTN_BASE} bg-gray-200 text-gray-500 cursor-default`} title="送信済み">
        依頼済み
      </span>
    );
  }

  // ▼ 通常ボタン
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={sending}
      className={`${BTN_BASE} ${
        sending ? "bg-gray-200 text-gray-500 cursor-default" : "bg-white hover:bg-gray-50 text-gray-800"
      }`}
      title="返金依頼を送信"
    >
      {sending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      返金依頼
    </button>
  );
}
