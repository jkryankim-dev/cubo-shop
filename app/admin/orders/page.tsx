"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listAllOrders } from "@/lib/admin";
import { formatPriceKRW } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShopOrder, ShopOrderStatus } from "@/types";

const STATUS_OPTIONS: { value: ShopOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "결제 대기" },
  { value: "paid", label: "결제 완료" },
  { value: "preparing", label: "배송 준비" },
  { value: "shipped", label: "배송 중" },
  { value: "delivered", label: "배송 완료" },
  { value: "cancelled", label: "취소" },
  { value: "refunded", label: "환불" },
];

const STATUS_LABEL: Record<ShopOrderStatus, string> = {
  pending: "결제 대기",
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
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<ShopOrderStatus | "all">("all");

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

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (
        filter &&
        !o.id.includes(filter) &&
        !o.shippingAddress?.recipient?.includes(filter) &&
        !o.shippingAddress?.phone?.includes(filter)
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
        전체 주문 흐름 관리 — 주문 클릭으로 상세 / 송장 입력.
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
                    <th className="py-3 pr-2">받는분</th>
                    <th className="py-3 pr-2">상품</th>
                    <th className="py-3 pr-2">금액</th>
                    <th className="py-3 pr-4">송장</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((o) => (
                    <tr
                      key={o.id}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                    >
                      <td colSpan={6} className="p-0">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr_0.8fr_0.8fr] items-center gap-2 px-4 py-3"
                        >
                          <span className="font-mono text-xs">
                            #{o.id.slice(0, 12)}
                          </span>
                          <span>
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-xs font-medium",
                                STATUS_COLOR[o.status],
                              )}
                            >
                              {STATUS_LABEL[o.status]}
                            </span>
                          </span>
                          <span className="text-sm">
                            {o.shippingAddress?.recipient ?? "—"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {o.items.length}개
                          </span>
                          <span className="font-semibold">
                            {formatPriceKRW(o.totalAmount)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {o.trackingNumber
                              ? `${o.carrier ?? ""} ${o.trackingNumber}`
                              : "미입력"}
                          </span>
                        </Link>
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
