"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listAllOrders } from "@/lib/admin";
import { formatPriceKRW } from "@/lib/format";
import type { ShopOrder } from "@/types";

const STATUS_LABEL: Record<ShopOrder["status"], string> = {
  pending: "주문 접수",
  paid: "결제 완료",
  preparing: "배송 준비",
  shipped: "배송 중",
  delivered: "배송 완료",
  cancelled: "취소",
  refunded: "환불",
};

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listAllOrders()
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .catch((err) => {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : "주문 로드 실패");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 결제 데이터: paymentId 가 있는 주문만 (PG 연동 후 자동 표시)
  const payments = useMemo(
    () => orders.filter((o) => o.paymentId),
    [orders],
  );

  const summary = useMemo(() => {
    const paid = orders.filter(
      (o) =>
        o.status !== "cancelled" &&
        o.status !== "refunded" &&
        o.status !== "pending",
    );
    const refunded = orders.filter((o) => o.status === "refunded");
    return {
      paidCount: paid.length,
      paidAmount: paid.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
      refundedCount: refunded.length,
      refundedAmount: refunded.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
    };
  }, [orders]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">결제 관리</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        실제 결제·환불은 PG (포트원/토스) 연동 후 자동 채워집니다.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CreditCard className="size-4" /> 결제 완료
            </div>
            <p className="mt-2 text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatPriceKRW(summary.paidAmount)
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading ? "—" : `${summary.paidCount}건`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CreditCard className="size-4" /> 환불
            </div>
            <p className="mt-2 text-2xl font-bold text-destructive">
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatPriceKRW(summary.refundedAmount)
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading ? "—" : `${summary.refundedCount}건`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">결제 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                결제 내역이 없습니다.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                포트원/토스 PG 가 연동되면 결제 ID 와 함께 자동으로 표시돼요.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">주문번호</th>
                    <th className="py-2 pr-4">결제 ID</th>
                    <th className="py-2 pr-4">금액</th>
                    <th className="py-2 pr-4">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((o) => (
                    <tr key={o.id}>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-mono text-xs hover:underline"
                        >
                          #{o.id.slice(0, 12)}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {o.paymentId}
                      </td>
                      <td className="py-3 pr-4 font-semibold">
                        {formatPriceKRW(o.totalAmount)}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {STATUS_LABEL[o.status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
