"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import { cancelMyPendingOrderAction } from "@/lib/actions/checkout";
import { formatPriceKRW } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShopOrder, ShopOrderStatus } from "@/types";

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

export default function MypageOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        if (!user) return;
        const q = query(
          collection(db, "shop_orders"),
          where("customerUid", "==", user.uid),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setOrders(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShopOrder),
        );
      } catch (err) {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : "주문 로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visibleOrders = useMemo(() => orders, [orders]);

  async function handleCancel(orderId: string) {
    if (!user) return;
    if (!window.confirm("이 주문을 취소할까요? (재고가 즉시 복원됩니다)"))
      return;
    setCancellingId(orderId);
    try {
      const idToken = await user.getIdToken();
      const result = await cancelMyPendingOrderAction(idToken, orderId);
      if (result.success) {
        toast.success(result.message);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: "cancelled", cancelReason: "user-cancel" }
              : o,
          ),
        );
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "취소 실패");
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-2 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (visibleOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>주문 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              주문 내역이 없습니다.
            </p>
            <Link href="/products">
              <Button variant="outline">상품 보러가기</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {visibleOrders.map((o) => {
        const isPending = o.status === "pending";
        return (
          <Card key={o.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">
                    #{o.id.slice(0, 12)}
                  </p>
                  <p className="mt-0.5 text-sm">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        STATUS_COLOR[o.status],
                      )}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                    {isPending && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        입금 확인 중
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-base font-bold text-brand-pink">
                  {formatPriceKRW(o.totalAmount)}
                </p>
              </div>

              <ul className="text-sm text-foreground/90">
                {o.items.map((it, i) => (
                  <li key={i}>
                    {it.name}{" "}
                    <span className="text-muted-foreground">× {it.quantity}</span>
                  </li>
                ))}
              </ul>

              {o.trackingNumber && (
                <p className="text-xs text-muted-foreground">
                  배송 — {o.carrier} {o.trackingNumber}
                </p>
              )}
              {o.cancelReason && (
                <p className="text-xs text-destructive">
                  취소 사유: {o.cancelReason}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Link href={`/order/${o.id}`}>
                  <Button variant="ghost" size="sm">
                    상세 보기
                  </Button>
                </Link>
                {isPending && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancellingId === o.id}
                    onClick={() => handleCancel(o.id)}
                  >
                    {cancellingId === o.id ? "취소 중…" : "주문 취소"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
