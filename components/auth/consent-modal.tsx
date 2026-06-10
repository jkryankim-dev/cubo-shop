"use client";

// =====================================================================
// 첫 로그인 동의 모달
//
// 발동 조건: 로그인된 회원 (익명·관리자 아님) + shop_customers.consents 미존재.
// 동의 항목:
//   - 이용약관 (필수)
//   - 개인정보 처리방침 (필수)
//   - 마케팅/신상품 수신 (선택)
//   - 카카오톡 알림톡 수신 (선택)
// 필수 미동의 시 모달 닫기 차단 + 로그아웃 유도.
// =====================================================================

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth/auth-provider";
import { saveCustomerConsents } from "@/lib/auth";
import { signOut } from "@/lib/auth";

export function ConsentModal() {
  const { user, profile, admin, loading, refreshProfile } = useAuth();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [kakao, setKakao] = useState(false);
  const [saving, setSaving] = useState(false);

  const shouldShow = useMemo(() => {
    if (loading) return false;
    if (!user || user.isAnonymous) return false;
    if (admin) return false; // 관리자는 동의 모달 skip
    if (!profile) return false; // 프로필 로딩 전
    return !profile.consents; // 동의 정보 없으면 표시
  }, [loading, user, admin, profile]);

  useEffect(() => {
    if (shouldShow) {
      // 매번 모달 뜰 때 체크박스 초기화
      setTerms(false);
      setPrivacy(false);
      setMarketing(false);
      setKakao(false);
    }
  }, [shouldShow]);

  if (!shouldShow || !user) return null;

  async function handleAgree() {
    if (!terms || !privacy) {
      toast.error("필수 항목 (이용약관·개인정보 처리방침) 에 동의해주세요.");
      return;
    }
    setSaving(true);
    try {
      if (!user) return;
      await saveCustomerConsents(user.uid, { terms, privacy, marketing, kakao });
      await refreshProfile();
      toast.success("동의가 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecline() {
    if (window.confirm("필수 항목 미동의 시 서비스 이용이 제한됩니다. 로그아웃 하시겠어요?")) {
      await signOut();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">서비스 이용 동의</CardTitle>
          <p className="text-xs text-muted-foreground">
            CUBO Shop 을 처음 이용하시네요. 아래 항목에 동의해주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="font-medium text-destructive">[필수]</span>{" "}
              <Link
                href="/terms"
                target="_blank"
                className="underline underline-offset-2"
              >
                이용약관
              </Link>{" "}
              동의
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="font-medium text-destructive">[필수]</span>{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="underline underline-offset-2"
              >
                개인정보 처리방침
              </Link>{" "}
              동의
            </span>
          </label>
          <Separator />
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-1"
            />
            <span className="flex-1 text-muted-foreground">
              [선택] 마케팅·신상품 알림 수신
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={kakao}
              onChange={(e) => setKakao(e.target.checked)}
              className="mt-1"
            />
            <span className="flex-1 text-muted-foreground">
              [선택] 카카오톡 알림톡 수신
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleDecline}>
              나중에
            </Button>
            <Button
              size="sm"
              onClick={handleAgree}
              disabled={saving || !terms || !privacy}
            >
              {saving ? "저장 중…" : "동의하고 시작하기"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
