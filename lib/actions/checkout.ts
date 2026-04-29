"use server";

// =====================================================================
// 결제·주문 Server Actions
//
// 흐름:
//   1) createPendingOrder: 주문 생성 + 재고 차감 (트랜잭션)
//   2) 클라이언트가 토스 SDK 로 결제 요청
//   3) confirmPaymentAction: 토스 confirm API 호출 + status=paid
//   4) failPaymentAction / cancelOrderAction: 재고 복원 + status=cancelled
//   5) cleanupExpiredOrdersAction: 6시간 경과 pending 자동 취소
// =====================================================================

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  sendCancelledAlimtalk,
  sendPaymentConfirmedAlimtalk,
  sendVirtualAccountIssuedAlimtalk,
} from "@/lib/alimtalk";
import { bankNameOf } from "@/lib/banks";
import type {
  Product,
  ShippingAddress,
  ShopCartItem,
  ShopOrder,
} from "@/types";

const PAYMENT_HOLD_MS = 6 * 60 * 60 * 1000; // 6시간

interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

async function verifyAuth(idToken: string): Promise<string | null> {
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

async function verifyAdmin(idToken: string): Promise<string | null> {
  const uid = await verifyAuth(idToken);
  if (!uid) return null;
  const adminDoc = await adminDb().collection("shop_admins").doc(uid).get();
  return adminDoc.exists ? uid : null;
}

// ---------------------------------------------------------------------
// 1) 주문 생성 + 재고 차감 (트랜잭션)
// ---------------------------------------------------------------------
// === GUEST_CHECKOUT (토스 승인 후 제거) ===
// 비회원/회원 모두 사용 가능한 주문자 정보 인자. 회원 전용으로 회귀 시
// `buyerInfo` 필드 + isGuest 처리 + signInAsGuest 호출처 grep 으로 제거하세요.
export interface BuyerInfo {
  name: string;
  phone: string;
  email: string;
}
// === GUEST_CHECKOUT END ===

export interface CreatePendingOrderInput {
  idToken: string;
  items: ShopCartItem[];
  shippingAddress: ShippingAddress;
  /** 주문자 정보 (회원이면 프로필보다 입력값 우선). GUEST_CHECKOUT 흐름에서 필수. */
  buyerInfo?: BuyerInfo;
}

export async function createPendingOrderAction(
  input: CreatePendingOrderInput,
): Promise<ActionResult<{ orderId: string; amount: number; orderName: string }>> {
  const uid = await verifyAuth(input.idToken);
  if (!uid) return { success: false, message: "로그인이 필요합니다." };

  if (!input.items.length)
    return { success: false, message: "장바구니가 비어있습니다." };

  // 회원 프로필 (있으면) — 비회원(익명)이면 없음
  const customerSnap = await adminDb()
    .collection("shop_customers")
    .doc(uid)
    .get();
  const customer = customerSnap.exists
    ? (customerSnap.data() as {
        name?: string;
        companyName?: string;
        grade?: "general" | "business";
        phone?: string;
        email?: string;
      })
    : null;

  // 주문자 정보 결정: buyerInfo 우선, 없으면 회원 프로필, 그것도 없으면 에러
  const buyerName = input.buyerInfo?.name?.trim() || customer?.name || "";
  const buyerPhone = input.buyerInfo?.phone?.trim() || customer?.phone || "";
  const buyerEmail = input.buyerInfo?.email?.trim() || customer?.email || "";
  if (!buyerName || !buyerPhone || !buyerEmail) {
    return {
      success: false,
      message: "주문자 정보(이름·전화·이메일)를 모두 입력해주세요.",
    };
  }
  const isGuest = !customer;

  const orderId = adminDb().collection("shop_orders").doc().id;

  const result = await adminDb().runTransaction(async (tx) => {
    let totalAmount = 0;
    const orderItems: ShopOrder["items"] = [];

    for (const it of input.items) {
      if (it.quantity <= 0) {
        throw new Error("수량이 0 이하인 항목이 있습니다.");
      }
      const productRef = adminDb().collection("products").doc(it.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists) {
        throw new Error(`존재하지 않는 상품: ${it.productId}`);
      }
      const product = productSnap.data() as Product;
      if (product.isDeleted === true || product.hidden === true) {
        throw new Error(`판매 중지 상품: ${product.name ?? it.productId}`);
      }
      if (!product.tags?.includes("ON")) {
        throw new Error(`현재 판매하지 않는 상품: ${product.name ?? it.productId}`);
      }
      const stock = product.stock ?? 0;
      if (stock < it.quantity) {
        throw new Error(
          `${product.name} 재고 부족 (요청 ${it.quantity}, 가용 ${stock})`,
        );
      }
      tx.update(productRef, {
        stock: FieldValue.increment(-it.quantity),
      });
      const unitPrice = product.priceA ?? product.defaultPrice ?? 0;
      const lineTotal = unitPrice * it.quantity;
      totalAmount += lineTotal;
      orderItems.push({
        productId: it.productId,
        name: product.name,
        unitPrice,
        quantity: it.quantity,
        totalPrice: lineTotal,
        image: product.imageUrl,
      });
    }

    const expiresAt = Timestamp.fromMillis(Date.now() + PAYMENT_HOLD_MS);

    // 객체 리터럴로 직접 set — admin/client Timestamp 타입 차이를 피함
    tx.set(adminDb().collection("shop_orders").doc(orderId), {
      id: orderId,
      customerUid: uid,
      customerName: buyerName,
      customerCompany:
        customer?.companyName ??
        (customer?.grade === "business" ? customer.name : undefined),
      customerGrade: customer?.grade ?? "general",
      customerPhone: buyerPhone,
      customerEmail: buyerEmail,
      isGuest,
      items: orderItems,
      totalAmount,
      status: "pending",
      shippingAddress: input.shippingAddress,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { totalAmount, orderName: orderItems[0]?.name ?? "주문" };
  });

  const orderName =
    input.items.length > 1
      ? `${result.orderName} 외 ${input.items.length - 1}건`
      : result.orderName;

  return {
    success: true,
    message: "주문이 접수되었습니다.",
    data: {
      orderId,
      amount: result.totalAmount,
      orderName,
    },
  };
}

// ---------------------------------------------------------------------
// 2) 토스 결제 확정 (successUrl 콜백에서 호출)
// ---------------------------------------------------------------------
export interface ConfirmPaymentInput {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export async function confirmPaymentAction(
  input: ConfirmPaymentInput,
): Promise<ActionResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey)
    return {
      success: false,
      message: "결제 환경변수 (TOSS_SECRET_KEY) 가 비어있습니다.",
    };

  // 주문 검증 (위변조 방지: 우리 DB 의 totalAmount 와 일치하는지)
  const orderRef = adminDb().collection("shop_orders").doc(input.orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return { success: false, message: "주문 없음" };
  const order = orderSnap.data() as ShopOrder;
  if (order.totalAmount !== input.amount) {
    return { success: false, message: "결제 금액이 주문 금액과 다릅니다." };
  }
  if (order.status !== "pending") {
    return {
      success: true,
      message: `이미 처리된 주문입니다 (status=${order.status}).`,
    };
  }

  // 토스 confirm API
  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: input.amount,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    return {
      success: false,
      message: `토스 결제 확인 실패: ${errText.slice(0, 200)}`,
    };
  }
  const tossData = (await res.json()) as {
    method?: string;
    paymentKey?: string;
    status?: string;
    virtualAccount?: {
      accountNumber?: string;
      bankCode?: string;
      dueDate?: string;
    };
  };

  // 가상계좌 발급 — 입금 대기 (status: WAITING_FOR_DEPOSIT)
  if (
    tossData.status === "WAITING_FOR_DEPOSIT" &&
    tossData.virtualAccount?.accountNumber
  ) {
    const va = tossData.virtualAccount;
    const virtualAccount = {
      bankCode: va.bankCode,
      bankName: bankNameOf(va.bankCode),
      accountNumber: va.accountNumber,
      dueDate: va.dueDate,
    };
    await orderRef.update({
      paymentId: tossData.paymentKey ?? input.paymentKey,
      paymentMethod: tossData.method ?? "VIRTUAL_ACCOUNT",
      virtualAccount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await sendVirtualAccountIssuedAlimtalk({
      ...order,
      paymentMethod: "VIRTUAL_ACCOUNT",
      virtualAccount,
    }).catch((err) =>
      console.warn("[alimtalk] virtual-account-issued 발송 실패", err),
    );
    return {
      success: true,
      message:
        "가상계좌가 발급되었습니다. 6시간 이내 입금해주시면 주문이 확정됩니다.",
    };
  }

  // 그 외 — DONE 등 즉시 결제 확정 (카드 등)
  await orderRef.update({
    status: "paid",
    paymentId: tossData.paymentKey ?? input.paymentKey,
    paymentMethod: tossData.method ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 알림톡 — 결제 확정 (실패해도 결제 결과 영향 X)
  const updated = { ...order, status: "paid" as const };
  await sendPaymentConfirmedAlimtalk(updated).catch((err) =>
    console.warn("[alimtalk] payment-confirmed 발송 실패", err),
  );

  // ERP 동기화 webhook (실패해도 결제 결과에는 영향 X)
  await notifyErpOrderSync().catch((err) =>
    console.warn("[erp-sync] 호출 실패 — 관리자 수동 재동기화 필요할 수 있음", err),
  );

  return { success: true, message: "결제 확정되었습니다." };
}

/**
 * ERP 의 shop-orders sync 엔드포인트 호출 (best-effort).
 * cubo-shop → ERP 자동 반영의 단일 진입점입니다.
 * 호출 실패해도 결제 결과에는 영향이 없도록 try/catch 처리.
 */
async function notifyErpOrderSync(): Promise<void> {
  const url = process.env.ERP_SYNC_URL;
  const secret = process.env.ERP_SYNC_SECRET;
  if (!url || !secret) return; // 미설정 시 조용히 skip
  await fetch(`${url}?key=${encodeURIComponent(secret)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: "cubo-shop", trigger: "payment-confirm" }),
    // 5초 타임아웃 — Next.js Server Action 의 응답 지연을 막음
    signal: AbortSignal.timeout(5000),
  });
}

// ---------------------------------------------------------------------
// 3) 결제 실패 / 사용자 취소 / 만료 — 재고 복원 + status=cancelled
// ---------------------------------------------------------------------
async function cancelOrderInternal(
  orderId: string,
  reason: string,
): Promise<void> {
  let cancelled: ShopOrder | null = null;

  await adminDb().runTransaction(async (tx) => {
    const orderRef = adminDb().collection("shop_orders").doc(orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error("주문 없음");
    const order = orderSnap.data() as ShopOrder;
    if (order.status !== "pending") return; // 이미 처리됨

    // 재고 복원
    for (const it of order.items) {
      tx.update(adminDb().collection("products").doc(it.productId), {
        stock: FieldValue.increment(it.quantity),
      });
    }
    tx.update(orderRef, {
      status: "cancelled",
      cancelReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
    cancelled = { ...order, status: "cancelled", cancelReason: reason };
  });

  if (cancelled) {
    await sendCancelledAlimtalk(cancelled, reason).catch((err) =>
      console.warn("[alimtalk] cancelled 발송 실패", err),
    );
  }
}

export async function failPaymentAction(
  orderId: string,
  reason = "payment-fail",
): Promise<ActionResult> {
  try {
    await cancelOrderInternal(orderId, reason);
    return { success: true, message: "주문이 취소되었습니다." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "취소 실패",
    };
  }
}

export async function cancelMyPendingOrderAction(
  idToken: string,
  orderId: string,
): Promise<ActionResult> {
  const uid = await verifyAuth(idToken);
  if (!uid) return { success: false, message: "인증 실패" };
  const orderSnap = await adminDb()
    .collection("shop_orders")
    .doc(orderId)
    .get();
  if (!orderSnap.exists) return { success: false, message: "주문 없음" };
  const order = orderSnap.data() as ShopOrder;
  if (order.customerUid !== uid)
    return { success: false, message: "권한 없음" };
  if (order.status !== "pending")
    return { success: false, message: "이미 처리된 주문은 취소할 수 없습니다." };
  try {
    await cancelOrderInternal(orderId, "user-cancel");
    return { success: true, message: "주문이 취소되었습니다." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "취소 실패",
    };
  }
}

// ---------------------------------------------------------------------
// 4) 6시간 경과 pending 자동 정리
//    /admin/orders 진입 시 + cron (추후) 둘 다에서 호출 가능.
// ---------------------------------------------------------------------
export async function cleanupExpiredOrdersAction(): Promise<
  ActionResult<{ cleaned: number }>
> {
  const now = Timestamp.now();
  const snap = await adminDb()
    .collection("shop_orders")
    .where("status", "==", "pending")
    .where("expiresAt", "<", now)
    .get();
  let cleaned = 0;
  for (const doc of snap.docs) {
    try {
      await cancelOrderInternal(doc.id, "auto-expired");
      cleaned += 1;
    } catch (err) {
      console.warn("[cleanup-expired]", doc.id, err);
    }
  }
  return {
    success: true,
    message: `${cleaned}건 만료 처리`,
    data: { cleaned },
  };
}

// ---------------------------------------------------------------------
// 5) 무통장입금 등 수동 입금 마킹 (관리자)
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// 6) 관리자 — 주문 상태/송장 변경 + 알림톡 자동 발송
//    클라이언트 SDK 의 updateOrder 와 별개로, 알림톡 트리거가 필요한
//    상태 전환은 본 Server Action 사용 권장.
// ---------------------------------------------------------------------
export interface AdminUpdateOrderInput {
  idToken: string;
  orderId: string;
  status?: ShopOrder["status"];
  trackingNumber?: string;
  carrier?: string;
}

export async function adminUpdateOrderAction(
  input: AdminUpdateOrderInput,
): Promise<ActionResult> {
  const adminUid = await verifyAdmin(input.idToken);
  if (!adminUid)
    return { success: false, message: "관리자 권한이 필요합니다." };

  const orderRef = adminDb().collection("shop_orders").doc(input.orderId);
  const beforeSnap = await orderRef.get();
  if (!beforeSnap.exists) return { success: false, message: "주문 없음" };
  const before = beforeSnap.data() as ShopOrder;

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.status) patch.status = input.status;
  if (input.trackingNumber !== undefined)
    patch.trackingNumber = input.trackingNumber;
  if (input.carrier !== undefined) patch.carrier = input.carrier;

  await orderRef.update(patch);

  const after: ShopOrder = {
    ...before,
    ...(input.status ? { status: input.status } : {}),
    ...(input.trackingNumber !== undefined
      ? { trackingNumber: input.trackingNumber }
      : {}),
    ...(input.carrier !== undefined ? { carrier: input.carrier } : {}),
  };

  // 상태 전환 알림톡 (실패해도 무시)
  try {
    const { sendShippedAlimtalk, sendRefundedAlimtalk } = await import(
      "@/lib/alimtalk"
    );
    const transitioned = before.status !== after.status;
    const trackingAdded =
      input.trackingNumber && before.trackingNumber !== input.trackingNumber;
    if (
      (transitioned && after.status === "shipped") ||
      (after.status === "shipped" && trackingAdded)
    ) {
      await sendShippedAlimtalk(after);
    } else if (transitioned && after.status === "refunded") {
      await sendRefundedAlimtalk(after);
    }
    // delivered 알림톡은 택배사가 발송하므로 cubo-shop 측 X
  } catch (err) {
    console.warn("[alimtalk] status-transition 발송 실패", err);
  }

  return { success: true, message: "주문이 갱신되었습니다." };
}

export async function manuallyMarkPaidAction(
  idToken: string,
  orderId: string,
): Promise<ActionResult> {
  const adminUid = await verifyAdmin(idToken);
  if (!adminUid)
    return { success: false, message: "관리자 권한이 필요합니다." };

  const orderRef = adminDb().collection("shop_orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return { success: false, message: "주문 없음" };
  const order = orderSnap.data() as ShopOrder;
  if (order.status !== "pending") {
    return {
      success: false,
      message: `현재 상태(${order.status})에서 입금 마킹 불가`,
    };
  }

  await orderRef.update({
    status: "paid",
    manuallyPaidBy: adminUid,
    paymentMethod: "MANUAL_TRANSFER",
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 알림톡 — 결제 확정 (수동 입금 케이스도 동일 템플릿)
  await sendPaymentConfirmedAlimtalk({
    ...order,
    status: "paid",
    manuallyPaidBy: adminUid,
    paymentMethod: "MANUAL_TRANSFER",
  }).catch((err) =>
    console.warn("[alimtalk] manual paid 발송 실패", err),
  );
  await notifyErpOrderSync().catch((err) =>
    console.warn("[erp-sync] 호출 실패", err),
  );

  return { success: true, message: "입금 확인 처리되었습니다." };
}
