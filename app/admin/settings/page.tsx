"use client";

import { Settings as SettingsIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const BUSINESS = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "—",
  ceo: process.env.NEXT_PUBLIC_BUSINESS_CEO ?? "—",
  registrationNumber: process.env.NEXT_PUBLIC_BUSINESS_REG_NO ?? "—",
  mailOrderNumber: process.env.NEXT_PUBLIC_BUSINESS_MAIL_ORDER_NO ?? "—",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "—",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "—",
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "—",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "—",
};

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <SettingsIcon className="size-5" />
        사이트 설정
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        운영 정보는 환경변수로 관리됩니다. 변경은 Netlify Environment 또는
        로컬 <code>.env.local</code> 에서 수행하고 재배포해주세요.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">사업자 정보 (푸터 노출)</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <Row label="상호" value={BUSINESS.name} />
            <Row label="대표자" value={BUSINESS.ceo} />
            <Row
              label="사업자등록번호"
              value={BUSINESS.registrationNumber}
            />
            <Row
              label="통신판매업번호"
              value={BUSINESS.mailOrderNumber}
            />
            <Separator />
            <Row label="주소" value={BUSINESS.address} />
            <Row label="대표 전화" value={BUSINESS.phone} />
            <Row label="대표 이메일" value={BUSINESS.email} />
            <Separator />
            <Row label="사이트 URL" value={BUSINESS.siteUrl} />
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">환경변수 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <code>.env.local.example</code> 파일에 모든 환경변수의 자리와
            설명이 정리되어 있어요. <code>.env.local</code> 또는 Netlify
            Environment Variables 에 같은 이름으로 등록하면 자동 반영됩니다.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <code>NEXT_PUBLIC_BUSINESS_*</code> — 푸터 사업자 정보
            </li>
            <li>
              <code>NEXT_PUBLIC_FIREBASE_*</code> — Firebase 클라이언트 SDK
            </li>
            <li>
              <code>FIREBASE_ADMIN_*</code> — 서버 SDK (관리자 액션 등)
            </li>
            <li>
              <code>POPBILL_*</code> — 팝빌 알림톡
            </li>
            <li>
              <code>PORTONE_*</code> — 결제 PG (도메인 등록 후 활성화)
            </li>
            <li>
              <code>NEXT_PUBLIC_SENTRY_DSN</code> — Sentry 모니터링 (도메인 등록 후 활성화)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex-1 break-all">{value}</dd>
    </div>
  );
}
