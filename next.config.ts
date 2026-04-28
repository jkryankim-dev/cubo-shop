import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // 추후 운영 직전: 외부 이미지 호스트 화이트리스트 정리하고 next/image 로 마이그레이션
  // images: {
  //   remotePatterns: [
  //     { protocol: "https", hostname: "**.googleapis.com" },
  //     { protocol: "https", hostname: "**.firebasestorage.app" },
  //   ],
  // },
};

// Sentry 환경변수가 모두 채워졌을 때만 source map 업로드 등 활성화.
// 비어있으면 빌드 자체에는 영향 없이 SDK 만 동작 (no-op DSN 도 무방).
const sentryEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG!,
      project: process.env.SENTRY_PROJECT!,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
