"use client";

// =====================================================================
// 브라우저 전역 오류 리스너 — root layout 에 마운트
//
//   - window.onerror: 비동기 throw, 동기 throw 등
//   - unhandledrejection: catch 없는 Promise 거절
//
// 자기 자신이 무한 루프에 빠지지 않도록 헬퍼 안에서 fetch 실패는 조용히 무시.
// =====================================================================

import { useEffect } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { logClientError } from "@/lib/log-client-error";

export function ClientErrorListener() {
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    function onError(e: ErrorEvent) {
      logClientError({
        message: e.message || "(no message)",
        stack: e.error instanceof Error ? e.error.stack : undefined,
        context: `window.onerror @ ${e.filename ?? "?"}:${e.lineno ?? "?"}`,
        userUid: uid,
      });
    }
    function onUnhandled(e: PromiseRejectionEvent) {
      const reason = e.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : JSON.stringify(reason).slice(0, 500);
      logClientError({
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
        context: "unhandledrejection",
        userUid: uid,
      });
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, [uid]);

  return null;
}
