// =====================================================================
// 클라이언트 오류 로깅 헬퍼 — POST /api/log-error
//
// 사용처:
//   - components/client-error-listener.tsx (window.onerror, unhandledrejection)
//   - app/global-error.tsx (Next.js error boundary)
// =====================================================================

interface LogClientErrorInput {
  message: string;
  stack?: string;
  digest?: string;
  context?: string;
  userUid?: string;
  source?: "client" | "global";
  level?: "error" | "warn";
}

/**
 * 비동기 best-effort. 호출자는 await 하지 않아도 됨.
 * 네트워크 실패 등은 조용히 무시 (재귀 에러 방지).
 */
export function logClientError(input: LogClientErrorInput): void {
  if (typeof window === "undefined") return;
  try {
    const body = {
      source: input.source ?? "client",
      level: input.level ?? "error",
      message: input.message,
      stack: input.stack,
      digest: input.digest,
      context: input.context,
      userUid: input.userUid,
      url: window.location.href,
    };
    void fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // 무시
    });
  } catch {
    // 무시
  }
}
