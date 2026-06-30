"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { logClientError } from "@/lib/log-client-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
    logClientError({
      source: "global",
      message: error.message || "(no message)",
      stack: error.stack,
      digest: error.digest,
      context: "app/global-error.tsx",
    });
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          예기치 않은 오류가 발생했습니다.
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의해주세요.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="rounded-md border px-4 py-2 text-sm"
          >
            홈으로
          </a>
        </div>
      </body>
    </html>
  );
}
