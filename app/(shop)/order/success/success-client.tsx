"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clearCart } from "@/lib/cart";
import { confirmPaymentAction } from "@/lib/actions/checkout";

export default function SuccessClient() {
  const params = useSearchParams();
  const paymentKey = params.get("paymentKey") ?? "";
  const orderId = params.get("orderId") ?? "";
  const amountStr = params.get("amount") ?? "";

  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const amount = Number(amountStr);
      if (!paymentKey || !orderId || !Number.isFinite(amount)) {
        setState("fail");
        setMessage("결제 정보가 올바르지 않습니다.");
        return;
      }
      try {
        const result = await confirmPaymentAction({
          paymentKey,
          orderId,
          amount,
        });
        if (cancelled) return;
        if (result.success) {
          setState("ok");
          setMessage(result.message);
          clearCart();
        } else {
          setState("fail");
          setMessage(result.message);
        }
      } catch (err) {
        if (cancelled) return;
        setState("fail");
        setMessage(err instanceof Error ? err.message : "결제 확인 실패");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [paymentKey, orderId, amountStr]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          {state === "loading" && (
            <>
              <span className="size-8 animate-spin rounded-full border-2 border-brand-pink border-t-transparent" />
              <p className="text-sm text-muted-foreground">결제 확인 중…</p>
            </>
          )}
          {state === "ok" && (
            <>
              <CheckCircle2 className="size-10 text-brand-mint" />
              <p className="text-base font-semibold">결제가 확정되었습니다.</p>
              <p className="text-sm text-muted-foreground">
                주문번호:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">
                  {orderId}
                </code>
              </p>
              <p className="text-xs text-muted-foreground">
                평일 오후 2시 이전 결제 건은 당일 출고를 원칙으로 합니다.
              </p>
              <div className="mt-4 flex gap-2">
                <Link href="/mypage/orders">
                  <Button variant="outline">주문 내역</Button>
                </Link>
                <Link href="/products">
                  <Button>쇼핑 계속하기</Button>
                </Link>
              </div>
            </>
          )}
          {state === "fail" && (
            <>
              <XCircle className="size-10 text-destructive" />
              <p className="text-base font-semibold">결제 확정 실패</p>
              <p className="text-sm text-destructive">{message}</p>
              <p className="text-xs text-muted-foreground">
                같은 주문에 다시 결제를 시도하거나, 마이페이지에서 주문을 취소해주세요.
              </p>
              <div className="mt-4 flex gap-2">
                <Link href="/mypage/orders">
                  <Button variant="outline">주문 내역</Button>
                </Link>
                <Link href="/cart">
                  <Button>장바구니로</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
