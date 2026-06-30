// =====================================================================
// 클라이언트 오류 수집 엔드포인트 — POST /api/log-error
//
// 클라이언트의 window.onerror / unhandledrejection / global-error 가
// fetch 로 호출. 인증 없이 누구나 가능 (오류 메시지 + URL + UA 만 받음).
// 스팸 방지는 추후 IP rate limit 검토.
// =====================================================================

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";

interface LogPayload {
  source?: "client" | "global";
  level?: "error" | "warn";
  message?: unknown;
  stack?: unknown;
  digest?: unknown;
  url?: unknown;
  userUid?: unknown;
  context?: unknown;
  extra?: Record<string, unknown>;
}

function asString(v: unknown, max: number): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

export async function POST(req: Request) {
  let body: LogPayload;
  try {
    body = (await req.json()) as LogPayload;
  } catch {
    return new Response(null, { status: 204 });
  }

  const message = asString(body.message, 2000) ?? "(no message)";

  const doc: Record<string, unknown> = {
    source: body.source === "global" ? "global" : "client",
    level: body.level === "warn" ? "warn" : "error",
    message,
    timestamp: FieldValue.serverTimestamp(),
  };
  const stack = asString(body.stack, 5000);
  if (stack) doc.stack = stack;
  const digest = asString(body.digest, 200);
  if (digest) doc.digest = digest;
  const url = asString(body.url, 1000);
  if (url) doc.url = url;
  const userUid = asString(body.userUid, 128);
  if (userUid) doc.userUid = userUid;
  const context = asString(body.context, 256);
  if (context) doc.context = context;
  if (body.extra && typeof body.extra === "object") doc.extra = body.extra;

  const ua = req.headers.get("user-agent");
  if (ua) doc.userAgent = ua.slice(0, 500);

  try {
    await adminDb().collection("shop_error_logs").add(doc);
  } catch (err) {
    // 저장 실패도 조용히 — 클라이언트 흐름엔 영향 없게
    // eslint-disable-next-line no-console
    console.error("[log-error] firestore 저장 실패", err);
  }

  return new Response(null, { status: 204 });
}
