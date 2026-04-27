"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FirebaseError } from "firebase/app";
import DaumPostcode, { type Address } from "react-daum-postcode";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  LOGIN_ID_PATTERN,
  signUp,
  uploadBusinessLicense,
} from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [postcodeOpen, setPostcodeOpen] = useState(false);

  function handlePostcodeComplete(data: Address) {
    setPostcode(data.zonecode);
    setAddress1(data.roadAddress || data.jibunAddress);
    setPostcodeOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!LOGIN_ID_PATTERN.test(loginId)) {
      setError("아이디는 영문/숫자/_ 4~20자로 입력해주세요.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("성함/이메일/휴대폰번호는 필수입니다.");
      return;
    }
    if (!postcode.trim() || !address1.trim()) {
      setError("주소(우편번호 + 도로명/지번) 는 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      const cred = await signUp({
        loginId: loginId.trim(),
        password,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: {
          recipient: name.trim(),
          phone: phone.trim(),
          postcode: postcode.trim(),
          address1: address1.trim(),
          address2: address2.trim() || undefined,
        },
      });

      if (licenseFile) {
        try {
          await uploadBusinessLicense(cred.user.uid, licenseFile);
        } catch (err) {
          // 사업자등록증 업로드 실패는 가입 자체를 실패로 만들지 않음.
          // 마이페이지에서 다시 업로드 가능.
          console.warn("[signup] 사업자등록증 업로드 실패 — 마이페이지에서 재시도 가능:", err);
        }
      }

      router.push("/mypage");
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/email-already-in-use") {
          setError("이미 사용 중인 아이디입니다.");
        } else if (err.code === "auth/weak-password") {
          setError("비밀번호가 너무 약합니다. 8자 이상 + 숫자/문자 조합 권장.");
        } else {
          setError(`가입 실패: ${err.message}`);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("회원가입 중 알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
        <CardDescription>
          매장 사장님을 위한 도매 쇼핑몰 — 가입은 무료입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="아이디" required>
            <Input
              type="text"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="영문/숫자/_ 4~20자"
              required
            />
          </FormField>

          <FormField label="비밀번호" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
              required
            />
          </FormField>

          <FormField label="비밀번호 확인" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </FormField>

          <Separator />

          <FormField label="성함" required>
            <Input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </FormField>

          <FormField label="이메일" required>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@cubo.com"
              required
            />
          </FormField>

          <FormField
            label="휴대폰번호"
            required
            hint="본인인증은 추후 추가 예정 (숫자만 입력)"
          >
            <Input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="01012345678"
              required
            />
          </FormField>

          <Separator />

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              주소 <span className="text-destructive">*</span>
            </legend>
            <div className="flex gap-2">
              <Input
                type="text"
                value={postcode}
                onChange={(e) =>
                  setPostcode(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="우편번호"
                className="max-w-[140px]"
                readOnly
                required
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
              <div className="overflow-hidden rounded-md border border-border">
                <DaumPostcode
                  onComplete={handlePostcodeComplete}
                  style={{ height: 400 }}
                />
              </div>
            )}
            <Input
              type="text"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder="도로명/지번 주소"
              readOnly
              required
            />
            <Input
              type="text"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="상세주소 (동/호수 등)"
            />
          </fieldset>

          <Separator />

          <FormField
            label="사업자등록증 (선택)"
            hint="가입 후 마이페이지에서도 업로드 가능합니다."
          >
            <Input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
            />
          </FormField>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "가입 처리 중…" : "가입하기"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-brand-pink hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
