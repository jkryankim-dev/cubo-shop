// =====================================================================
// 서버 측 오류 로거 — shop_error_logs 컬렉션 (Admin SDK)
//
// 사용법: server action / api route 의 catch 안에서 호출.
// 로그 저장 자체가 실패해도 호출 측 흐름을 깨지 않도록 try/catch 로 감쌈.
// =====================================================================

import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";

interface LogServerErrorInput {
  message: string;
  stack?: string;
  /** 발생 컨텍스트 — 예: "createPendingOrderAction", "POST /api/log-error" */
  context?: string;
  userUid?: string;
  digest?: string;
  extra?: Record<string, unknown>;
  level?: "error" | "warn";
}

/** 서버 측 오류를 Firestore 에 best-effort 로 기록. */
export async function logServerError(input: LogServerErrorInput): Promise<void> {
  try {
    const doc: Record<string, unknown> = {
      source: "server",
      level: input.level ?? "error",
      message: (input.message ?? "(no message)").slice(0, 2000),
      timestamp: FieldValue.serverTimestamp(),
    };
    if (input.stack) doc.stack = input.stack.slice(0, 5000);
    if (input.context) doc.context = input.context;
    if (input.userUid) doc.userUid = input.userUid;
    if (input.digest) doc.digest = input.digest;
    if (input.extra) doc.extra = input.extra;
    await adminDb().collection("shop_error_logs").add(doc);
  } catch (logErr) {
    // 로그 저장 실패는 무시 (재귀 throw 방지). 콘솔에만 남김.
    // eslint-disable-next-line no-console
    console.error("[error-logger] 저장 실패", logErr);
  }
}
