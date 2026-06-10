"use client";

// =====================================================================
// 영업링크 (?ref=<code>) 부트스트랩
//
// 모든 페이지 진입 시 1회 실행:
//   1) ?ref=<code> 있으면 쿠키/localStorage 에 저장
//   2) recordSalesLinkVisitAction 호출 (세션 1회만)
//   3) 비로그인 상태면 익명 인증 (가격 노출 게이트 통과용)
//
// 익명 인증된 사용자는 결제 시도 시 거절되어 가입으로 유도됨 (checkout-view).
// =====================================================================

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signInAnonymously } from "firebase/auth";

import { useAuth } from "@/components/auth/auth-provider";
import { auth } from "@/lib/firebase";
import { recordSalesLinkVisitAction } from "@/lib/actions/sales-links";
import {
  getSalesRef,
  isVisitRecorded,
  markVisitRecorded,
  setSalesRef,
} from "@/lib/sales-ref";

export function SalesRefBootstrap() {
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const refParam = params.get("ref");

  // 1) URL ?ref 캡처 + visits++ (세션 1회)
  useEffect(() => {
    if (!refParam) return;
    setSalesRef(refParam);
    if (isVisitRecorded(refParam)) return;
    recordSalesLinkVisitAction(refParam)
      .then((res) => {
        if (res.success) markVisitRecorded(refParam);
      })
      .catch((err) => console.warn("[sales-ref] visit 기록 실패", err));
  }, [refParam]);

  // 2) ?ref 보유 + 비로그인 → 익명 인증으로 가격 노출 게이트 통과
  useEffect(() => {
    if (loading) return;
    if (user) return;
    const code = getSalesRef();
    if (!code) return;
    signInAnonymously(auth).catch((err) =>
      console.warn("[sales-ref] anonymous sign-in 실패", err),
    );
  }, [loading, user]);

  return null;
}
