"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth/auth-provider";

export default function MypageHomePage() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">프로필을 불러오는 중…</p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>내 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <Row label="아이디" value={profile.loginId} />
          <Row label="성함" value={profile.name} />
          <Row label="이메일" value={profile.email} />
          <Row label="휴대폰번호" value={profile.phone} />
          <Row
            label="회원 등급"
            value={
              profile.grade === "business"
                ? "사업자 회원 (도매 단가 적용)"
                : "일반 회원"
            }
          />
          <Separator />
          <Row
            label="기본 배송지"
            value={
              profile.defaultAddress
                ? `${profile.defaultAddress.postcode} ${profile.defaultAddress.address1} ${profile.defaultAddress.address2 ?? ""}`.trim()
                : "—"
            }
          />
          <Row
            label="사업자등록증"
            value={
              profile.businessLicense
                ? `업로드됨 (${statusLabel(profile.businessLicense.status)})`
                : "미등록"
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex-1">{value}</dd>
    </div>
  );
}

function statusLabel(status: "pending" | "approved" | "rejected") {
  if (status === "approved") return "승인 완료";
  if (status === "rejected") return "반려";
  return "검토 중";
}
