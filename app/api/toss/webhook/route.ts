// =====================================================================
// 토스페이먼츠 webhook 핸들러
//
// 토스가 비동기 이벤트 (가상계좌 입금 / 결제 취소 등) 를 알릴 때 호출.
// 토스 개발자센터 > 웹훅 메뉴에서 다음 URL 등록:
//   https://cubomall.kr/api/toss/webhook
//
// 보안:
//   - 우리 DB 의 paymentKey/orderId/totalAmount 와 일치 여부로 1차 검증
//   - 토스 IP 화이트리스트 권장 (Netlify Edge 는 IP 검증 어려움 — 위 검증 + paymentKey 일치로 대체)
//   - 환경변수 TOSS_WEBHOOK_SECRET 가 설정된 경우 헤더 검증 추가 (토스 콘솔 webhook
//     설정에서 시크릿 등록 시)
//
// 이벤트 (토스 v2 docs 기준):
//   - PAYMENT_STATUS_CHANGED       : 결제 상태 변경 (가상계좌 입금 등)
//   - DEPOSIT_CALLBACK              : 가상계좌 입금 콜백 (legacy)
//   - VIRTUAL_ACCOUNT_DEPOSIT       : 가상계좌 입금 (호환)
//   - 그 외 이벤트는 무시
// =====================================================================

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";
import { sendCancelledAlimtalk, sendPaymentConfirmedAlimtalk } from "@/lib/alimtalk";
import type { ShopOrder } from "@/types";

interface TossWebhookPayload {
  eventType?: string;
  createdAt?: string;
  data?: {
    paymentKey?: string;
    orderId?: string;
    status?:
      | "READY"
      | "IN_PROGRESS"
      | "WAITING_FOR_DEPOSIT"
      | "DONE"
      | "CANCELED"
      | "PARTIAL_CANCELED"
      | "ABORTED"
      | "EXPIRED";
    totalAmount?: number;
  };
  // legacy 형태도 일부 들어올 수 있음
  paymentKey?: string;
  orderId?: string;
  status?: string;
  totalAmount?: number;
}

export async function POST(req: NextRequest) {
  let payload: TossWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const data = payload.data ?? payload;
  const orderId = data.orderId;
  const status = data.status;
  const totalAmount = data.totalAmount;
  const paymentKey = data.paymentKey;

  if (!orderId || !status) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  // 옵션 — 시크릿 헤더 검증 (토스 콘솔에서 webhook 시크릿 등록한 경우)
  const expectedSecret = process.env.TOSS_WEBHOOK_SECRET;
  if (expectedSecret) {
    const incoming =
      req.headers.get("x-toss-signature") ??
      req.headers.get("toss-signature") ??
      req.headers.get("authorization");
    if (incoming && !incoming.includes(expectedSecret)) {
      return NextResponse.json({ ok: false, error: "bad-signature" }, { status: 401 });
    }
  }

  const orderRef = adminDb().collection("shop_orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    return NextResponse.json({ ok: false, error: "order-not-found" }, { status: 404 });
  }
  const order = orderSnap.data() as ShopOrder;

  // 위변조 1차 검증 — DB 의 totalAmount 와 일치
  if (typeof totalAmount === "number" && order.totalAmount !== totalAmount) {
    return NextResponse.json({ ok: false, error: "amount-mismatch" }, { status: 400 });
  }
  // paymentKey 가 우리 DB 에 이미 박혀있다면 일치 검증
  if (paymentKey && order.paymentId && order.paymentId !== paymentKey) {
    return NextResponse.json({ ok: false, error: "paymentkey-mismatch" }, { status: 400 });
  }

  switch (status) {
    case "DONE":
    case "WAITING_FOR_DEPOSIT": {
      // DONE 은 결제 완료 (카드 또는 가상계좌 입금). pending 일 때만 처리 (idempotent).
      if (status === "DONE" && order.status === "pending") {
        await orderRef.update({
          status: "paid",
          paymentId: paymentKey ?? order.paymentId,
          updatedAt: FieldValue.serverTimestamp(),
        });
        const updated = { ...order, status: "paid" as const };
        await sendPaymentConfirmedAlimtalk(updated).catch((err) =>
          console.warn("[toss-webhook] paid alimtalk fail", err),
        );
        await notifyErpOrderSync().catch((err) =>
          console.warn("[toss-webhook] erp sync fail", err),
        );
      }
      // WAITING_FOR_DEPOSIT 는 가상계좌 발급된 상태 — pending 유지
      break;
    }
    case "CANCELED":
    case "ABORTED":
    case "EXPIRED": {
      // 결제 취소·중단·만료 — pending 일 때만 재고 복원
      if (order.status === "pending") {
        await adminDb().runTransaction(async (tx) => {
          const fresh = await tx.get(orderRef);
          const data = fresh.data() as ShopOrder;
          if (data.status !== "pending") return;
          for (const it of data.items) {
            tx.update(adminDb().collection("products").doc(it.productId), {
              stock: FieldValue.increment(it.quantity),
            });
          }
          tx.update(orderRef, {
            status: "cancelled",
            cancelReason: `toss-${status.toLowerCase()}`,
            updatedAt: FieldValue.serverTimestamp(),
          });
        });
        await sendCancelledAlimtalk(
          { ...order, status: "cancelled" },
          `토스 ${status}`,
        ).catch((err) => console.warn("[toss-webhook] cancel alimtalk fail", err));
      }
      break;
    }
    default:
      // READY / IN_PROGRESS / PARTIAL_CANCELED 등은 우리 흐름에 영향 없음
      break;
  }

  return NextResponse.json({ ok: true });
}

async function notifyErpOrderSync(): Promise<void> {
  const url = process.env.ERP_SYNC_URL;
  const secret = process.env.ERP_SYNC_SECRET;
  if (!url || !secret) return;
  await fetch(`${url}?key=${encodeURIComponent(secret)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: "cubo-shop", trigger: "toss-webhook" }),
    signal: AbortSignal.timeout(5000),
  });
}
