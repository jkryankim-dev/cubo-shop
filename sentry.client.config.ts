// =====================================================================
// Sentry — 클라이언트 (브라우저) 설정
//
// DSN 이 비어있으면 init 자체를 건너뜁니다 (no-op).
// 사용자가 Sentry 가입 후 NEXT_PUBLIC_SENTRY_DSN 을 채우면 자동 활성화.
// =====================================================================

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
  });
}
