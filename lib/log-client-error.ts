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
 * 알려진 무해한 브라우저/SDK 노이즈 — 로그 수집에서 제외.
 * (기능 영향 없고 새로고침으로 해소되는 것들만 추가할 것)
 */
const IGNORED_MESSAGES: RegExp[] = [
  // Safari(WebKit) 탭 백그라운드 복귀 시 Firestore IndexedDB 연결 끊김 — 무해, 자동 재연결
  /Connection to Indexed Database server lost/i,
];

/** 같은 메시지 반복 발송 방지 (한 페이지 세션 내 60초 dedupe) */
const recentlySent = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;

/**
 * 비동기 best-effort. 호출자는 await 하지 않아도 됨.
 * 네트워크 실패 등은 조용히 무시 (재귀 에러 방지).
 */
export function logClientError(input: LogClientErrorInput): void {
  if (typeof window === "undefined") return;
  try {
    if (IGNORED_MESSAGES.some((re) => re.test(input.message))) return;

    const key = input.message.slice(0, 200);
    const now = Date.now();
    const last = recentlySent.get(key);
    if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return;
    recentlySent.set(key, now);
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
