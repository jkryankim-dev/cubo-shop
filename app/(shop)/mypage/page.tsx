"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DaumPostcode, { type Address } from "react-daum-postcode";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth/auth-provider";
import { updateProfile } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { claimMasterAdmin } from "@/lib/actions/master-admin";

export default function MypageHomePage() {
  const { user, profile, admin, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [adminClaimDone, setAdminClaimDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [postcodeOpen, setPostcodeOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setPostcode(profile.defaultAddress?.postcode ?? "");
    setAddress1(profile.defaultAddress?.address1 ?? "");
    setAddress2(profile.defaultAddress?.address2 ?? "");
  }, [profile]);

  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">프로필을 불러오는 중…</p>
    );
  }

  function handlePostcodeComplete(data: Address) {
    setPostcode(data.zonecode);
    setAddress1(data.roadAddress || data.jibunAddress);
    setPostcodeOpen(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.uid, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        defaultAddress: postcode.trim()
          ? {
              recipient: name.trim(),
              phone: phone.trim(),
              postcode: postcode.trim(),
              address1: address1.trim(),
              address2: address2.trim() || undefined,
            }
          : undefined,
      });
      await refreshProfile();
      setEditing(false);
      toast.success("내 정보가 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleClaimAdmin() {
    if (!user) return;
    setClaimingAdmin(true);
    try {
      const idToken = await user.getIdToken();
      const result = await claimMasterAdmin(idToken);
      if (result.success) {
        toast.success(result.message);
        await refreshProfile();
      } else {
        toast.error(result.message);
        setAdminClaimDone(true);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "마스터 등록 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setClaimingAdmin(false);
    }
  }

  // 마스터 관리자 등록 카드 — 본인이 admin 이 아니고 한 번도 시도하지 않았을 때만 노출.
  // 클릭 후 "이미 다른 사람이 마스터" 응답이면 카드 자동 숨김.
  const showMasterClaim = !admin && !adminClaimDone;

  if (!editing) {
    return (
      <div className="space-y-6">
        {showMasterClaim && (
          <Card className="border-brand-pink/40 bg-brand-pink/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-5 text-brand-pink" />
                마스터 관리자 등록
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-foreground/80">
                마스터 관리자가 아직 지정되지 않았다면 이 계정을 마스터로 등록할
                수 있어요. 등록 후에는 헤더에 <strong>관리자</strong> 메뉴가
                표시되며, 상품 노출 관리·사업자 회원 검토를 할 수 있습니다.
              </p>
              <p className="text-xs text-muted-foreground">
                ※ 한 번만 등록 가능 — 이미 다른 마스터가 있으면 등록되지 않습니다.
              </p>
              <Button onClick={handleClaimAdmin} disabled={claimingAdmin}>
                {claimingAdmin
                  ? "처리 중…"
                  : "이 계정을 마스터 관리자로 등록"}
              </Button>
            </CardContent>
          </Card>
        )}

        {admin && (
          <Card className="border-brand-mint/40 bg-brand-mint/10">
            <CardContent className="flex items-center justify-between gap-3 p-5 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-foreground/80" />
                <span className="font-medium">관리자 권한 활성화됨</span>
              </div>
              <Link href="/admin">
                <Button size="sm" variant="outline">
                  관리자 페이지로
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>내 정보</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            편집
          </Button>
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
                  ? `(${profile.defaultAddress.postcode}) ${profile.defaultAddress.address1} ${profile.defaultAddress.address2 ?? ""}`.trim()
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
            <Row
              label="알림톡 수신"
              value={profile.marketingOptIn ? "동의" : "미동의"}
            />
          </dl>
        </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>내 정보 편집</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>성함</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>이메일</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>휴대폰번호</Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            maxLength={13}
          />
        </div>
        <Separator />
        <div className="space-y-3">
          <Label>기본 배송지</Label>
          <div className="flex gap-2">
            <Input
              value={postcode}
              readOnly
              placeholder="우편번호"
              className="max-w-[140px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setPostcodeOpen((v) => !v)}
            >
              {postcodeOpen ? "닫기" : "우편번호 검색"}
            </Button>
          </div>
          {postcodeOpen && (
            <div className="overflow-hidden rounded-md border">
              <DaumPostcode
                onComplete={handlePostcodeComplete}
                style={{ height: 360 }}
              />
            </div>
          )}
          <Input value={address1} readOnly placeholder="도로명/지번 주소" />
          <Input
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
            placeholder="상세주소"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
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
