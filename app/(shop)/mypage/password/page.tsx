"use client";

import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/auth";

export default function PasswordPage() {
  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next1.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (next1 !== next2) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(current, next1);
      toast.success("비밀번호가 변경되었습니다.");
      setCurrent("");
      setNext1("");
      setNext2("");
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
          setError("현재 비밀번호가 올바르지 않습니다.");
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("비밀번호 변경 실패");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>비밀번호 변경</CardTitle>
        <CardDescription>
          현재 비밀번호를 입력해 본인 확인 후 새 비밀번호를 설정합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>현재 비밀번호</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>새 비밀번호</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={next1}
              onChange={(e) => setNext1(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>새 비밀번호 확인</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={next2}
              onChange={(e) => setNext2(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? "변경 중…" : "비밀번호 변경"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
