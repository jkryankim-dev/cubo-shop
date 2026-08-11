"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/components/auth/require-auth";
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

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <RequireAuth>
      <OrderDetailInner params={params} />
    </RequireAuth>
  );
}

function OrderDetailInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const snap = await getDoc(doc(db, "shop_orders", id));
        if (cancelled) return;
        if (!snap.exists()) {
          toast.error("주문을 찾을 수 없습니다.");
          return;
        }
        setOrder({ id: snap.id, ...snap.data() } as ShopOrder);
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
  }, [id, user]);

  async function handleCancel() {
    if (!user || !order) return;
    if (!window.confirm("이 주문을 취소할까요? 재고가 즉시 복원됩니다.")) return;
    setCancelling(true);
    try {
      const idToken = await user.getIdToken();
      const result = await cancelMyPendingOrderAction(idToken, order.id);
      if (result.success) {
        toast.success(result.message);
        setOrder({ ...order, status: "cancelled", cancelReason: "user-cancel" });
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "취소 실패");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-base font-medium">주문을 찾을 수 없습니다.</p>
        <Link
          href="/mypage/orders"
          className="mt-4 inline-flex items-center gap-1 text-sm text-brand-pink"
        >
          <ArrowLeft className="size-4" /> 주문 내역으로
        </Link>
      </div>
    );
  }

  const isPending = order.status === "pending";
  const trackingUrl = order.trackingNumber
    ? `https://search.naver.com/search.naver?query=${encodeURIComponent(`${order.carrier ?? ""} ${order.trackingNumber} 송장조회`)}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/mypage/orders"
        className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> 주문 내역
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            주문 #{order.id.slice(0, 12)}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.createdAt
              ? new Date(order.createdAt.toMillis()).toLocaleString("ko-KR")
              : ""}
          </p>
        </div>
        <span
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium",
            STATUS_COLOR[order.status],
          )}
        >
          {STATUS_LABEL[order.status]}
          {isPending && <span className="ml-2">· 입금 확인 중</span>}
        </span>
      </div>

      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">주문 상품</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {order.items.map((it, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded bg-muted">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image}
                        alt={it.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${it.productId}`}
                      className="line-clamp-1 text-sm font-medium hover:underline"
                    >
                      {it.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatPriceKRW(it.unitPrice)} × {it.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatPriceKRW(it.totalPrice ?? it.unitPrice * it.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-bold">
              <span>총 결제 금액</span>
              <span className="text-brand-pink">
                {formatPriceKRW(order.totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">배송 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>{order.shippingAddress.recipient}</strong>{" "}
              <span className="text-muted-foreground">
                ({order.shippingAddress.phone})
              </span>
            </p>
            <p>
              ({order.shippingAddress.postcode}){" "}
              {order.shippingAddress.address1}
              {order.shippingAddress.address2
                ? ` ${order.shippingAddress.address2}`
                : ""}
            </p>
            {order.shippingAddress.memo && (
              <p className="text-xs text-muted-foreground">
                메모: {order.shippingAddress.memo}
              </p>
            )}

            {order.trackingNumber && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-brand-mint/40 bg-brand-mint/10 p-3">
                <Truck className="size-4" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{order.carrier}</p>
                  <p className="text-xs text-muted-foreground">
                    송장: {order.trackingNumber}
                  </p>
                </div>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-pink hover:underline"
                  >
                    배송 조회 →
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">결제 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              결제 수단:{" "}
              <span className="text-muted-foreground">
                {order.paymentMethod === "BANK_TRANSFER"
                  ? "무통장입금"
                  : (order.paymentMethod ?? "—")}
              </span>
            </p>
            {isPending && order.depositAccount && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <p className="text-sm font-semibold">
                  {order.depositAccount.bankName}{" "}
                  {order.depositAccount.accountNumber}
                </p>
                <p className="text-muted-foreground">
                  예금주: {order.depositAccount.accountHolder}
                </p>
                <p className="mt-2 text-muted-foreground">
                  위 계좌로 입금해주세요. 입금이 확인되면 순차적으로 출고됩니다.
                </p>
              </div>
            )}
            {order.cancelReason && (
              <p className="text-destructive">
                취소 사유: {order.cancelReason}
              </p>
            )}
          </CardContent>
        </Card>

        {isPending && (
          <Button
            variant="outline"
            className="w-full"
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? "취소 중…" : "주문 취소"}
          </Button>
        )}
      </div>
    </div>
  );
}
