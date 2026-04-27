"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "./auth-provider";

interface RequireAuthProps {
  children: ReactNode;
  /** 관리자 전용 페이지면 true */
  adminOnly?: boolean;
  /** 로그인 후 돌아올 경로 (기본: 현재 경로) */
  redirectTo?: string;
}

export function RequireAuth({
  children,
  adminOnly,
  redirectTo,
}: RequireAuthProps) {
  const { user, admin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const back =
      redirectTo ??
      (typeof window !== "undefined" ? window.location.pathname : "/");

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(back)}`);
      return;
    }
    if (adminOnly && !admin) {
      router.replace("/");
    }
  }, [loading, user, admin, adminOnly, redirectTo, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    );
  }

  if (adminOnly && !admin) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">권한 확인 중…</p>
      </div>
    );
  }

  return <>{children}</>;
}
