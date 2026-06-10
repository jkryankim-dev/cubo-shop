"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithCustomToken } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase";
import { signIn } from "@/lib/auth";
import { erpLoginAction } from "@/lib/actions/erp-login";

export default function LoginPageInner() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        불러오는 중…
      </CardContent>
    </Card>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const id = loginId.trim();
    try {
      // 1) cubo-shop 자체 가입 회원 (fake email 기반) 우선 시도
      await signIn(id, password);
      router.push(redirectTo);
      return;
    } catch (err: unknown) {
      const notFoundCodes = new Set([
        "auth/invalid-credential",
        "auth/user-not-found",
        "auth/wrong-password",
      ]);
      const isNotFound =
        err instanceof FirebaseError && notFoundCodes.has(err.code);
      if (!isNotFound) {
        if (err instanceof FirebaseError) {
          setError(`로그인 실패: ${err.message}`);
        } else {
          setError("로그인 중 오류가 발생했습니다.");
        }
        setSubmitting(false);
        return;
      }
      // 2) cubo-shop 에 없는 ID → ERP 비가맹 회원 fallback
      try {
        const result = await erpLoginAction({ loginId: id, password });
        if (!result.success || !result.customToken) {
          setError(result.message);
          setSubmitting(false);
          return;
        }
        await signInWithCustomToken(auth, result.customToken);
        router.push(redirectTo);
      } catch (e2) {
        setError(
          e2 instanceof Error ? e2.message : "ERP 로그인 처리 중 오류가 발생했습니다.",
        );
        setSubmitting(false);
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>
          CUBO Shop 도매 회원으로 로그인하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="loginId">아이디</Label>
            <Input
              id="loginId"
              type="text"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "로그인 중…" : "로그인"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            아직 계정이 없으신가요?{" "}
            <Link
              href="/signup"
              className="font-medium text-brand-pink hover:underline"
            >
              회원가입
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
