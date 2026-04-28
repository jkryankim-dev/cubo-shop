// =====================================================================
// Next.js instrumentation — 런타임별 Sentry init 진입점
//
// DSN 이 없거나 Sentry import 가 실패하더라도 SSR 전체가 깨지지 않도록
// try/catch 로 보호합니다.
// =====================================================================

const hasSentryDsn = Boolean(
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
);

export async function register() {
  if (!hasSentryDsn) return;
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
    if (process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  } catch (err) {
    // Sentry 초기화 실패는 앱 동작에 영향 없도록 무시
    console.warn("[instrumentation] Sentry init skipped:", err);
  }
}

export async function onRequestError(
  err: unknown,
  request: Request,
  context: unknown,
) {
  if (!hasSentryDsn) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(
      err,
      request as unknown as Parameters<typeof Sentry.captureRequestError>[1],
      context as Parameters<typeof Sentry.captureRequestError>[2],
    );
  } catch {
    // Sentry 호출 실패해도 무시
  }
}
