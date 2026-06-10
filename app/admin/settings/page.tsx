"use client";

import { useEffect, useState } from "react";
import { Save, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getPaymentSettings,
  upsertPaymentSettings,
} from "@/lib/site-settings";

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
  const { user } = useAuth();
  const [loadingPay, setLoadingPay] = useState(true);
  const [savingPay, setSavingPay] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [noticeText, setNoticeText] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await getPaymentSettings();
        if (cancelled) return;
        if (s) {
          setBankName(s.bankName ?? "");
          setAccountNumber(s.accountNumber ?? "");
          setAccountHolder(s.accountHolder ?? "");
          setNoticeText(s.noticeText ?? "");
        }
      } catch (err) {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : "조회 실패");
      } finally {
        if (!cancelled) setLoadingPay(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingPay(true);
    try {
      await upsertPaymentSettings({
        bankName,
        accountNumber,
        accountHolder,
        noticeText: noticeText || undefined,
        updatedBy: user.uid,
      });
      toast.success("결제 계좌 정보가 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSavingPay(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <SettingsIcon className="size-5" />
        사이트 설정
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        결제 계좌는 이 화면에서 직접 수정합니다. 사업자 정보는 환경변수
        (Netlify) 로 관리됩니다.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            무통장입금 받을 계좌
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            결제 화면·주문 완료 페이지·알림톡에 이 계좌가 안내됩니다.
            변경 즉시 새 주문부터 반영됩니다 (기존 주문에는 스냅샷이 박혀 있어 영향 없음).
          </p>
        </CardHeader>
        <CardContent>
          {loadingPay ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <form onSubmit={handleSavePayment} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>은행명 *</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="예: 국민은행"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>예금주 *</Label>
                  <Input
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="예: 주식회사 쿠보"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>계좌번호 *</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="예: 123-456-789012"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>입금 안내 문구 (선택)</Label>
                <Textarea
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  rows={2}
                  placeholder="예: 입금자명에 주문자명을 적어주세요. 미입금 시 6시간 후 자동 취소됩니다."
                />
              </div>
              <Button type="submit" disabled={savingPay}>
                <Save className="mr-1.5 size-4" />
                {savingPay ? "저장 중…" : "저장"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">사업자 정보 (푸터 노출)</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <Row label="상호" value={BUSINESS.name} />
            <Row label="대표자" value={BUSINESS.ceo} />
            <Row label="사업자등록번호" value={BUSINESS.registrationNumber} />
            <Row label="통신판매업번호" value={BUSINESS.mailOrderNumber} />
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
              <code>NEXT_PUBLIC_SENTRY_DSN</code> — Sentry 모니터링
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
