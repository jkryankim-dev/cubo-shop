// =====================================================================
// 알림톡 발송 헬퍼 — 팝빌 (KakaoService.sendATS_one) 단건 발송
//
// 핵심 원칙:
//   1) 정적 본문은 등록된 템플릿과 글자 단위 일치 (변수 #{} 만 자유)
//      → 띄어쓰기·줄바꿈 한 글자 다르면 reject(630) → SMS 대체 → 비용 상승
//   2) 발송 실패해도 호출 측 흐름(결제/송장 등)은 영향 없도록 try/catch
//   3) shop_messages 컬렉션에 발송 결과 로그
// =====================================================================

import "server-only";

import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { getKakaoService, POPBILL } from "./popbill";
import { formatPriceKRW } from "./format";
import type { ShopOrder } from "@/types";

// ---------------------------------------------------------------------
// 저레벨 발송 헬퍼
// ---------------------------------------------------------------------
export interface AlimtalkOptions {
  templateCode: string;
  receiverPhone: string;
  receiverName?: string;
  /** 변수 치환된 최종 본문 — 등록 템플릿의 정적 부분과 정확히 일치해야 함 */
  msg: string;
  altSubject?: string;
  altContent?: string;
  /** 알림톡 실패 시 SMS 자동 대체 ("C") / SMS 미사용 ("A") / LMS ("L") */
  altSendType?: "C" | "A" | "L";
}

export interface AlimtalkLog {
  receiptID: string;
  templateCode: string;
  receiverPhone: string;
  receiverName: string | null;
  relatedOrderId: string | null;
  relatedEvent: string | null;
}

export async function sendAlimtalk(
  opts: AlimtalkOptions,
  log?: { orderId?: string; event: string },
): Promise<{ receiptID: string }> {
  if (!POPBILL.SenderPhone) {
    throw new Error("POPBILL_SENDER_PHONE 미설정");
  }
  if (!opts.templateCode) {
    throw new Error(
      `알림톡 템플릿 코드가 비어있어요 (event=${log?.event ?? "?"}). 환경변수를 확인하세요.`,
    );
  }

  const cleanPhone = opts.receiverPhone.replace(/[^0-9]/g, "");
  if (cleanPhone.length < 10) {
    throw new Error(`잘못된 수신 번호: ${opts.receiverPhone}`);
  }

  const kakao = getKakaoService();
  const altType = opts.altSendType ?? "C";

  const receiptID = await new Promise<string>((resolve, reject) => {
    kakao.sendATS_one(
      POPBILL.DistributorCorpNum,
      opts.templateCode,
      POPBILL.SenderPhone,
      opts.msg,
      opts.altSubject ?? "",
      opts.altContent ?? opts.msg,
      altType,
      "", // 즉시 발송
      cleanPhone,
      opts.receiverName ?? "",
      POPBILL.DistributorUserID,
      null,
      null,
      (rid) => resolve(rid),
      (err) =>
        reject(
          new Error(`팝빌 알림톡 발송 실패 [${err.code}]: ${err.message}`),
        ),
    );
  });

  // 발송 로그 (shop_messages)
  try {
    await adminDb()
      .collection("shop_messages")
      .add({
        receiptID,
        type: "alimtalk",
        templateCode: opts.templateCode,
        receiverPhone: cleanPhone,
        receiverName: opts.receiverName ?? null,
        relatedOrderId: log?.orderId ?? null,
        relatedEvent: log?.event ?? null,
        sentAt: FieldValue.serverTimestamp(),
        status: "pending",
      });
  } catch (err) {
    console.warn("[alimtalk] shop_messages 로그 저장 실패:", err);
  }

  return { receiptID };
}

// ---------------------------------------------------------------------
// 이벤트별 메시지 빌더
//
// ⚠️ 본문은 팝빌 콘솔에 등록된 템플릿과 글자 단위로 정확히 일치해야 함.
//    템플릿 변경 시 본 함수의 반환 문자열도 같이 바꿀 것.
// ---------------------------------------------------------------------

function summarizeItems(items: ShopOrder["items"]): string {
  return items
    .map((it, i) => `${i + 1}. ${it.name} ${it.quantity}개`)
    .join("\n");
}

function shortOrderId(id: string): string {
  return id.slice(0, 12);
}

function envOrEmpty(key: string): string {
  return process.env[key] ?? "";
}

/** 가상계좌 발급 안내 (입금 대기) */
export async function sendVirtualAccountIssuedAlimtalk(
  order: ShopOrder,
): Promise<void> {
  if (!order.customerPhone) return;
  if (!order.virtualAccount) return;

  const va = order.virtualAccount;
  const dueDate = va.dueDate
    ? new Date(va.dueDate).toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "발급 후 6시간";
  const account = `${va.bankName ?? ""} ${va.accountNumber}`.trim();

  const msg = `[CUBO MALL] 입금 대기

${order.customerName}님, 가상계좌가 발급되었습니다.
아래 계좌로 기한 내 입금해주시면 주문이 확정됩니다.

▷ 주문번호: ${shortOrderId(order.id)}
▷ 입금금액: ${formatPriceKRW(order.totalAmount)}
▷ 입금계좌: ${account}
▷ 입금기한: ${dueDate}

기한 내 미입금 시 자동 취소되며 재고가 복원됩니다.

▷ 마이페이지: cubomall.kr/mypage/orders`;

  await sendAlimtalk(
    {
      templateCode: envOrEmpty("POPBILL_TEMPLATE_VIRTUAL_ACCOUNT_ISSUED"),
      receiverPhone: order.customerPhone,
      receiverName: order.customerName,
      msg,
    },
    { orderId: order.id, event: "virtual-account-issued" },
  );
}

/** 결제 확정 알림 (status: pending → paid) */
export async function sendPaymentConfirmedAlimtalk(
  order: ShopOrder,
): Promise<void> {
  if (!order.customerPhone) return;
  const msg = `[CUBO MALL] 결제 완료

${order.customerName}님, cubomall.kr 에서 주문하신 건의 결제가 완료되었습니다.

▷ 주문번호: ${shortOrderId(order.id)}
▷ 주문상품:
${summarizeItems(order.items)}
▷ 결제금액: ${formatPriceKRW(order.totalAmount)}

평일 오후 2시 이전 결제 건은 당일 출고됩니다.

▷ 마이페이지: cubomall.kr/mypage/orders`;

  await sendAlimtalk(
    {
      templateCode: envOrEmpty("POPBILL_TEMPLATE_PAYMENT_CONFIRMED"),
      receiverPhone: order.customerPhone,
      receiverName: order.customerName,
      msg,
    },
    { orderId: order.id, event: "paid" },
  );
}

/** 배송 시작 알림 (status: shipped + 송장번호 입력) */
export async function sendShippedAlimtalk(order: ShopOrder): Promise<void> {
  if (!order.customerPhone) return;
  const msg = `[CUBO MALL] 상품 출고

${order.customerName}님, 주문하신 상품이 출고되었습니다.

▷ 주문번호: ${shortOrderId(order.id)}
▷ 택배사: ${order.carrier ?? "-"}
▷ 송장번호: ${order.trackingNumber ?? "-"}

배송 조회는 택배사 사이트에서 확인해주세요.

▷ 마이페이지: cubomall.kr/mypage/orders`;

  await sendAlimtalk(
    {
      templateCode: envOrEmpty("POPBILL_TEMPLATE_SHIPPED"),
      receiverPhone: order.customerPhone,
      receiverName: order.customerName,
      msg,
    },
    { orderId: order.id, event: "shipped" },
  );
}

// 배송 완료 알림은 택배사가 발송하므로 cubo-shop 측 발송 X.
// (필요해지면 sendDeliveredAlimtalk 함수 + POPBILL_TEMPLATE_DELIVERED 환경변수 부활)

/** 주문 취소 알림 */
export async function sendCancelledAlimtalk(
  order: ShopOrder,
  reason: string,
): Promise<void> {
  if (!order.customerPhone) return;
  const msg = `[CUBO MALL] 주문 취소

${order.customerName}님, 주문이 취소되었습니다.

▷ 주문번호: ${shortOrderId(order.id)}
▷ 취소사유: ${reason}
▷ 환불금액: ${formatPriceKRW(order.totalAmount)}

결제 수단별 환불 처리는 영업일 기준 1~3일 소요됩니다.`;

  await sendAlimtalk(
    {
      templateCode: envOrEmpty("POPBILL_TEMPLATE_CANCELLED"),
      receiverPhone: order.customerPhone,
      receiverName: order.customerName,
      msg,
    },
    { orderId: order.id, event: "cancelled" },
  );
}

/** 환불 완료 알림 (status: refunded) */
export async function sendRefundedAlimtalk(order: ShopOrder): Promise<void> {
  if (!order.customerPhone) return;
  const msg = `[CUBO MALL] 환불 완료

${order.customerName}님, 환불이 완료되었습니다.

▷ 주문번호: ${shortOrderId(order.id)}
▷ 환불금액: ${formatPriceKRW(order.totalAmount)}

결제 수단에 따라 영업일 기준 1~3일 내 입금됩니다.`;

  await sendAlimtalk(
    {
      templateCode: envOrEmpty("POPBILL_TEMPLATE_REFUNDED"),
      receiverPhone: order.customerPhone,
      receiverName: order.customerName,
      msg,
    },
    { orderId: order.id, event: "refunded" },
  );
}
