"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/firebase";
import { formatPriceKRW } from "@/lib/format";
import type { ShopOrder } from "@/types";

export default function SuccessClient() {
  const params = useSearchParams();
  const orderId = params.get("orderId") ?? "";

  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!orderId) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const snap = await getDoc(doc(db, "shop_orders", orderId));
        if (cancelled) return;
        if (snap.exists()) {
          setOrder(snap.data() as ShopOrder);
        }
      } catch (err) {
        console.error("[order-success]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Card>
        <CardContent className="space-y-4 py-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="size-10 text-brand-mint" />
            <h1 className="text-lg font-semibold">주문이 접수되었습니다</h1>
            <p className="text-sm text-muted-foreground">
              아래 계좌로 <strong>6시간 이내</strong> 입금해주세요. 입금 확인 후
              출고됩니다.
            </p>
          </div>

          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : !order ? (
            <p className="text-center text-sm text-destructive">
              주문 정보를 찾을 수 없습니다.
            </p>
          ) : (
            <>
              <Separator />
              <dl className="space-y-2 text-sm">
                <Row label="주문번호">
                  <code className="rounded bg-muted px-1.5 py-0.5">
                    {order.id.slice(0, 12)}
                  </code>
                </Row>
                <Row label="입금금액">
                  <span className="font-bold text-brand-pink">
                    {formatPriceKRW(order.totalAmount)}
                  </span>
                </Row>
                {order.depositAccount && (
                  <>
                    <Row label="입금계좌">
                      <span className="font-semibold">
                        {order.depositAccount.bankName}{" "}
                        {order.depositAccount.accountNumber}
                      </span>
                    </Row>
                    <Row label="예금주">
                      {order.depositAccount.accountHolder}
                    </Row>
                  </>
                )}
              </dl>
              {order.depositAccount?.depositorGuide && (
                <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-line">
                  {order.depositAccount.depositorGuide}
                </p>
              )}
            </>
          )}

          <div className="flex justify-center gap-2 pt-2">
            <Link href="/mypage/orders">
              <Button variant="outline">주문 내역</Button>
            </Link>
            <Link href="/products">
              <Button>쇼핑 계속하기</Button>
            </Link>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            평일 오후 2시 이전 입금 확인 건은 당일 출고를 원칙으로 합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
