"use server";

// =====================================================================
// 결제·주문 Server Actions (무통장입금 단일 결제)
//
// 흐름:
//   1) createPendingOrderAction: 사업자 승인 회원만, 재고 차감 + 주문 생성
//      → status="pending", paymentMethod="BANK_TRANSFER", 회사 계좌 스냅샷 박음
//   2) 고객이 회사 법인계좌로 입금
//   3) manuallyMarkPaidAction: 관리자가 입금 확인 후 status=paid 마킹
//   4) cancelMyPendingOrderAction / cleanupExpiredOrdersAction: 재고 복원 + cancelled
//   5) adminUpdateOrderAction: 송장 입력·발송 처리 + 알림톡
// =====================================================================

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  sendBankTransferRequestedAlimtalk,
  sendCancelledAlimtalk,
  sendPaymentConfirmedAlimtalk,
} from "@/lib/alimtalk";
import { logServerError } from "@/lib/error-logger";
import { getBundleUnit, getDisplayPrice } from "@/lib/visibility";
import type {
  Product,
  ShippingAddress,
  ShopCartItem,
  ShopOrder,
  ShopOrderDepositAccount,
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

/** 회사 법인계좌 (shop_site_settings/payment) 스냅샷 fetch. 미설정 시 null. */
async function fetchDepositAccountSnapshot(): Promise<ShopOrderDepositAccount | null> {
  const snap = await adminDb()
    .collection("shop_site_settings")
    .doc("payment")
    .get();
  if (!snap.exists) return null;
  const data = snap.data() as {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    noticeText?: string;
  };
  if (!data.bankName || !data.accountNumber || !data.accountHolder) return null;
  return {
    bankName: data.bankName,
    accountNumber: data.accountNumber,
    accountHolder: data.accountHolder,
    depositorGuide: data.noticeText || undefined,
  };
}

// ---------------------------------------------------------------------
// 1) 주문 생성 + 재고 차감 (트랜잭션)
// ---------------------------------------------------------------------
export interface BuyerInfo {
  name: string;
  phone: string;
  email: string;
}

export interface CreatePendingOrderInput {
  idToken: string;
  items: ShopCartItem[];
  shippingAddress: ShippingAddress;
  /** 주문자 정보 (회원이면 프로필보다 입력값 우선) */
  buyerInfo?: BuyerInfo;
}

export async function createPendingOrderAction(
  input: CreatePendingOrderInput,
): Promise<
  ActionResult<{
    orderId: string;
    amount: number;
    orderName: string;
    depositAccount: ShopOrderDepositAccount;
  }>
> {
  try {
    return await createPendingOrderImpl(input);
  } catch (err) {
    // server-side throw 를 그대로 노출하면 production 빌드에서
    // "An error occurred in the Server Components render. ..." 형태의
    // cryptic 메시지가 client toast 에 그대로 박힘. friendly 메시지로 변환.
    console.error("[checkout] createPendingOrderAction", err);
    void logServerError({
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: "createPendingOrderAction",
    });
    const msg =
      err instanceof Error ? err.message : "주문 처리 중 오류가 발생했습니다.";
    return { success: false, message: msg };
  }
}

async function createPendingOrderImpl(
  input: CreatePendingOrderInput,
): Promise<
  ActionResult<{
    orderId: string;
    amount: number;
    orderName: string;
    depositAccount: ShopOrderDepositAccount;
  }>
> {
  const uid = await verifyAuth(input.idToken);
  if (!uid) return { success: false, message: "로그인이 필요합니다." };

  if (!input.items.length)
    return { success: false, message: "장바구니가 비어있습니다." };

  // 사업자 승인 회원만 결제 가능 — 서버 측 강제 검증
  const customerSnap = await adminDb()
    .collection("shop_customers")
    .doc(uid)
    .get();
  if (!customerSnap.exists) {
    return {
      success: false,
      message:
        "회원 정보가 없습니다. 회원가입 후 사업자등록증을 등록해주세요.",
    };
  }
  const customer = customerSnap.data() as {
    name?: string;
    companyName?: string;
    grade?: "general" | "business";
    phone?: string;
    email?: string;
    businessLicense?: { status?: "pending" | "approved" | "rejected" };
    erpEntityId?: string;
  };
  // 결제 자격: 사업자 등급 + (사업자등록증 승인 OR ERP 비가맹 마이그레이션 회원)
  // auth-provider 의 approvedBusiness 조건과 일치.
  const hasApprovedLicense =
    customer.businessLicense?.status === "approved";
  const isMigratedFromErp = !!customer.erpEntityId;
  if (
    customer.grade !== "business" ||
    (!hasApprovedLicense && !isMigratedFromErp)
  ) {
    return {
      success: false,
      message:
        "사업자 승인 회원만 주문 가능합니다. 마이페이지에서 사업자등록증을 등록·승인받아주세요.",
    };
  }

  // 회사 법인계좌 설정 필수 — 미설정 시 결제 차단
  const depositAccount = await fetchDepositAccountSnapshot();
  if (!depositAccount) {
    return {
      success: false,
      message:
        "결제 계좌가 설정되지 않았습니다. 운영자에게 문의해주세요.",
    };
  }

  const buyerName = input.buyerInfo?.name?.trim() || customer?.name || "";
  const buyerPhone = input.buyerInfo?.phone?.trim() || customer?.phone || "";
  const buyerEmail = input.buyerInfo?.email?.trim() || customer?.email || "";
  if (!buyerName || !buyerPhone || !buyerEmail) {
    return {
      success: false,
      message: "주문자 정보(이름·전화·이메일)를 모두 입력해주세요.",
    };
  }

  const orderId = adminDb().collection("shop_orders").doc().id;

  const txResult = await adminDb().runTransaction(async (tx) => {
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
      // 안전재고 fetch 후 effective stock 검증
      const safetySnap = await tx.get(
        adminDb().collection("shop_safety_stocks").doc(it.productId),
      );
      const safetyStock = safetySnap.exists
        ? ((safetySnap.data()?.threshold as number | undefined) ?? 0)
        : 0;
      const stock = product.stock ?? 0;
      const effectiveStock = Math.max(0, stock - safetyStock);
      if (effectiveStock < it.quantity) {
        throw new Error(
          `${product.name} 재고 부족 (가용 ${effectiveStock}, 안전재고 ${safetyStock} 차감)`,
        );
      }
      const bundleUnit = getBundleUnit(product);
      if (it.quantity % bundleUnit !== 0) {
        throw new Error(
          `${product.name} 은 ${bundleUnit}개 단위로 구매해야 합니다 (요청 ${it.quantity})`,
        );
      }
      tx.update(productRef, {
        stock: FieldValue.increment(-it.quantity),
      });
      const unitPrice = getDisplayPrice(product);
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

    tx.set(adminDb().collection("shop_orders").doc(orderId), {
      id: orderId,
      customerUid: uid,
      customerName: buyerName,
      customerCompany:
        customer?.companyName ??
        (customer?.grade === "business" ? customer.name : undefined),
      customerGrade: customer?.grade ?? "business",
      customerPhone: buyerPhone,
      customerEmail: buyerEmail,
      items: orderItems,
      totalAmount,
      status: "pending",
      paymentMethod: "BANK_TRANSFER",
      depositAccount,
      shippingAddress: input.shippingAddress,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { totalAmount, orderName: orderItems[0]?.name ?? "주문", orderItems };
  });

  const orderName =
    input.items.length > 1
      ? `${txResult.orderName} 외 ${input.items.length - 1}건`
      : txResult.orderName;

  // 무통장입금 안내 알림톡 (실패해도 주문 결과 영향 X)
  const orderForAlimtalk: ShopOrder = {
    id: orderId,
    customerUid: uid,
    customerName: buyerName,
    customerPhone: buyerPhone,
    customerEmail: buyerEmail,
    items: txResult.orderItems,
    totalAmount: txResult.totalAmount,
    status: "pending",
    shippingAddress: input.shippingAddress,
    paymentMethod: "BANK_TRANSFER",
    depositAccount,
  };
  sendBankTransferRequestedAlimtalk(orderForAlimtalk).catch((err) =>
    console.warn("[alimtalk] bank-transfer-requested 발송 실패", err),
  );

  return {
    success: true,
    message: "주문이 접수되었습니다. 안내된 계좌로 입금해주세요.",
    data: {
      orderId,
      amount: txResult.totalAmount,
      orderName,
      depositAccount,
    },
  };
}

/**
 * ERP 의 shop-orders sync 엔드포인트 호출 (best-effort).
 * cubo-shop → ERP 자동 반영의 단일 진입점입니다.
 * 호출 실패해도 결제 결과에는 영향이 없도록 try/catch 처리.
 *
 * trigger 종류:
 *   - "payment-confirm"  : 무통장 입금 확인 (pending → paid)
 *   - "shipped"          : 송장 입력·발송 처리 (preparing → shipped)
 *                          → ERP 가 이 시점에 전자세금계산서 발행하도록 합의됨
 */
async function notifyErpOrderSync(
  trigger: "payment-confirm" | "shipped",
  orderId: string,
): Promise<void> {
  const url = process.env.ERP_SYNC_URL;
  const secret = process.env.ERP_SYNC_SECRET;
  if (!url || !secret) return; // 미설정 시 조용히 skip
  await fetch(`${url}?key=${encodeURIComponent(secret)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: "cubo-shop", trigger, orderId }),
    signal: AbortSignal.timeout(5000),
  });
}

// ---------------------------------------------------------------------
// 2) 주문 취소 — 재고 복원 + status=cancelled (사용자 / 만료 / 관리자)
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
// 3) 6시간 경과 pending 자동 정리
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
// 4) 관리자 — 주문 상태/송장 변경 + 알림톡 자동 발송
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
  } catch (err) {
    console.warn("[alimtalk] status-transition 발송 실패", err);
  }

  // shipped 전환 시 ERP webhook 한 번 더 호출 → ERP 가 전자세금계산서 발행 트리거.
  // 송장 추가 (재발송) 만 한 경우는 status 변동 없으므로 webhook 안 보냄.
  if (before.status !== "shipped" && after.status === "shipped") {
    await notifyErpOrderSync("shipped", input.orderId).catch((err) =>
      console.warn("[erp-sync] shipped 호출 실패", err),
    );
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
    paymentMethod: "BANK_TRANSFER",
    updatedAt: FieldValue.serverTimestamp(),
  });

  await sendPaymentConfirmedAlimtalk({
    ...order,
    status: "paid",
    manuallyPaidBy: adminUid,
    paymentMethod: "BANK_TRANSFER",
  }).catch((err) =>
    console.warn("[alimtalk] manual paid 발송 실패", err),
  );
  await notifyErpOrderSync("payment-confirm", orderId).catch((err) =>
    console.warn("[erp-sync] 호출 실패", err),
  );

  return { success: true, message: "입금 확인 처리되었습니다." };
}
