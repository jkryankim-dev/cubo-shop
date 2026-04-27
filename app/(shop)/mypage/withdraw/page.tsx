"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "@/lib/auth";

const CONFIRM_TEXT = "탈퇴합니다";

export default function WithdrawPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (confirm !== CONFIRM_TEXT) {
      setError(`확인 문구를 정확히 입력해주세요: "${CONFIRM_TEXT}"`);
      return;
    }
    setSubmitting(true);
    try {
      await deleteAccount(password);
      toast.success("회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.");
      router.push("/");
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
          setError("비밀번호가 올바르지 않습니다.");
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("탈퇴 처리 실패");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-destructive">회원 탈퇴</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold text-destructive">탈퇴 시 유의사항</p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-foreground/80">
            <li>회원 정보 (성함, 연락처, 주소) 가 즉시 삭제됩니다.</li>
            <li>
              주문 기록은 전자상거래법에 따라 일정 기간 보관 후 자동 삭제됩니다.
            </li>
            <li>
              사업자 회원 등급 / 사업자등록증은 함께 처리되며, 재가입 시
              새로 검토가 필요합니다.
            </li>
            <li>탈퇴 후에는 동일 정보로 재가입까지 일정 시간이 소요될 수 있습니다.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>현재 비밀번호</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              확인 문구 입력 —{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {CONFIRM_TEXT}
              </code>
            </Label>
            <Input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button
            type="submit"
            variant="destructive"
            disabled={submitting || confirm !== CONFIRM_TEXT}
          >
            {submitting ? "처리 중…" : "회원 탈퇴"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
