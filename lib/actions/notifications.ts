"use server";

// =====================================================================
// 관리자용 알림톡 발송 — 팝빌 SDK 호출 (서버 전용)
// 호출자는 admin 이어야 함.
// =====================================================================

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { sendAlimtalk } from "@/lib/alimtalk";

interface ActionResult {
  success: boolean;
  message: string;
}

async function verifyAdmin(idToken: string) {
  const decoded = await adminAuth().verifyIdToken(idToken);
  const adminDoc = await adminDb()
    .collection("shop_admins")
    .doc(decoded.uid)
    .get();
  if (!adminDoc.exists) {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return decoded.uid;
}

export interface SendAlimtalkInput {
  templateCode: string;
  receiverPhone: string;
  receiverName?: string;
  message: string;
  altMessage?: string;
}

export async function sendAlimtalkAction(
  idToken: string,
  input: SendAlimtalkInput,
): Promise<ActionResult> {
  try {
    await verifyAdmin(idToken);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "인증 실패",
    };
  }

  if (!input.templateCode || !input.receiverPhone || !input.message) {
    return {
      success: false,
      message: "템플릿 코드, 수신 번호, 메시지는 필수입니다.",
    };
  }

  try {
    const { receiptID } = await sendAlimtalk(
      {
        templateCode: input.templateCode,
        receiverPhone: input.receiverPhone,
        receiverName: input.receiverName,
        msg: input.message,
        altContent: input.altMessage,
      },
      { event: "manual" },
    );
    return {
      success: true,
      message: `발송 접수 완료 (영수증: ${receiptID})`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "발송 실패",
    };
  }
}
