"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { failPaymentAction } from "@/lib/actions/checkout";

export default function FailClient() {
  const params = useSearchParams();
  const orderId = params.get("orderId") ?? "";
  const code = params.get("code") ?? "";
  const message = params.get("message") ?? "결제가 완료되지 않았습니다.";
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (orderId) {
        // 토스가 fail url 로 redirect 한 경우 — pending 주문 정리 (재고 복원)
        try {
          await failPaymentAction(orderId, `toss-fail:${code || "unknown"}`);
        } catch (err) {
          console.warn("[fail] cancel order failed", err);
        }
      }
      if (!cancelled) setBusy(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [orderId, code]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <XCircle className="size-10 text-destructive" />
          <p className="text-base font-semibold">결제가 완료되지 않았습니다.</p>
          <p className="text-sm text-muted-foreground">{message}</p>
          {code && (
            <p className="text-xs text-muted-foreground">에러 코드: {code}</p>
          )}
          {busy ? (
            <p className="text-xs text-muted-foreground">주문 정리 중…</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              주문이 자동 취소되어 재고가 복원되었습니다.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Link href="/cart">
              <Button variant="outline">장바구니로</Button>
            </Link>
            <Link href="/products">
              <Button>다른 상품 보기</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
