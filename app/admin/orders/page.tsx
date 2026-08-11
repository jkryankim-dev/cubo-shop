"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { listAllOrders } from "@/lib/admin";
import { formatPriceKRW } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShopOrder, ShopOrderStatus } from "@/types";

const STATUS_OPTIONS: { value: ShopOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "주문 접수" },
  { value: "paid", label: "결제 완료" },
  { value: "preparing", label: "배송 준비" },
  { value: "shipped", label: "배송 중" },
  { value: "delivered", label: "배송 완료" },
  { value: "cancelled", label: "취소" },
  { value: "refunded", label: "환불" },
];

const STATUS_LABEL: Record<ShopOrderStatus, string> = {
  pending: "주문 접수",
  paid: "결제 완료",
  preparing: "배송 준비",
  shipped: "배송 중",
  delivered: "배송 완료",
  cancelled: "취소",
  refunded: "환불",
};

const STATUS_COLOR: Record<ShopOrderStatus, string> = {
  pending: "bg-muted",
  paid: "bg-brand-mint/40",
  preparing: "bg-brand-mint/60",
  shipped: "bg-brand-pink/15 text-brand-pink",
  delivered: "bg-foreground text-background",
  cancelled: "bg-destructive/15 text-destructive",
  refunded: "bg-destructive/15 text-destructive",
};

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<ShopOrderStatus | "all">("all");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const list = await listAllOrders();
      if (!cancelled) {
        setOrders(list);
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (
        filter &&
        !o.id.includes(filter) &&
        !o.shippingAddress?.recipient?.includes(filter) &&
        !o.shippingAddress?.phone?.includes(filter) &&
        !o.customerName?.includes(filter)
      ) {
        return false;
      }
      return true;
    });
  }, [orders, filter, status]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">주문 관리</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        주문이 접수되면 ERP에 자동으로 &ldquo;접수대기&rdquo;로 등록됩니다. 입금 확인·주문 상태 관리는 ERP에서 통합적으로 수행합니다.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const active = status === opt.value;
          const count =
            opt.value === "all"
              ? orders.length
              : orders.filter((o) => o.status === opt.value).length;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-accent/40",
              )}
            >
              {opt.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
        <Input
          type="search"
          placeholder="주문번호/이름/전화 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="ml-auto max-w-xs"
        />
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              해당하는 주문이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 pl-4 pr-2">주문번호</th>
                    <th className="py-3 pr-2">상태</th>
                    <th className="py-3 pr-2">받는분 / 주문자</th>
                    <th className="py-3 pr-2">상품</th>
                    <th className="py-3 pr-2">금액</th>
                    <th className="py-3 pr-2">입금/송장</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((o) => {
                    const isPending = o.status === "pending";
                    return (
                      <tr key={o.id}>
                        <td className="py-3 pl-4 pr-2">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="font-mono text-xs hover:underline"
                          >
                            #{o.id.slice(0, 12)}
                          </Link>
                        </td>
                        <td className="py-3 pr-2">
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 text-xs font-medium",
                              STATUS_COLOR[o.status],
                            )}
                          >
                            {STATUS_LABEL[o.status]}
                          </span>
                        </td>
                        <td className="py-3 pr-2">
                          <div className="text-sm">
                            {o.shippingAddress?.recipient ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            주문자: {o.customerName ?? "—"}
                          </div>
                        </td>
                        <td className="py-3 pr-2 text-xs text-muted-foreground">
                          {o.items.length}개
                        </td>
                        <td className="py-3 pr-2 font-semibold">
                          {formatPriceKRW(o.totalAmount)}
                        </td>
                        <td className="py-3 pr-2 text-xs">
                          {isPending ? (
                            <span className="text-muted-foreground">
                              입금 확인 대기 (ERP)
                            </span>
                          ) : o.trackingNumber ? (
                            <span className="text-foreground/80">
                              {o.carrier} {o.trackingNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
