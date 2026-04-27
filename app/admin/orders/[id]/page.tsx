"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { updateOrder } from "@/lib/admin";
import { formatPriceKRW } from "@/lib/format";
import type { ShopOrder, ShopOrderStatus } from "@/types";

const STATUSES: { value: ShopOrderStatus; label: string }[] = [
  { value: "pending", label: "결제 대기" },
  { value: "paid", label: "결제 완료" },
  { value: "preparing", label: "배송 준비" },
  { value: "shipped", label: "배송 중" },
  { value: "delivered", label: "배송 완료" },
  { value: "cancelled", label: "취소" },
  { value: "refunded", label: "환불" },
];

const CARRIERS = [
  "CJ대한통운",
  "로젠택배",
  "한진택배",
  "롯데택배",
  "우체국택배",
];

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ShopOrderStatus>("pending");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const snap = await getDoc(doc(db, "shop_orders", id));
        if (cancelled) return;
        if (!snap.exists()) {
          toast.error("주문을 찾을 수 없습니다.");
          return;
        }
        const data = { id: snap.id, ...snap.data() } as ShopOrder;
        setOrder(data);
        setStatus(data.status);
        setCarrier(data.carrier ?? "");
        setTrackingNumber(data.trackingNumber ?? "");
      } catch (err) {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : "조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave() {
    if (!order) return;
    setSaving(true);
    try {
      await updateOrder({
        orderId: order.id,
        status,
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
      });
      toast.success("주문 정보가 갱신되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted-foreground">주문을 찾을 수 없습니다.</p>
        <Link
          href="/admin/orders"
          className="mt-4 inline-flex items-center gap-1 text-sm text-brand-pink"
        >
          <ArrowLeft className="size-4" /> 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/admin/orders"
        className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> 주문 목록
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">
        주문 #{order.id.slice(0, 12)}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        결제 PG 콜백 데이터는 결제 단계에서 자동 채워집니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">상품</CardTitle>
            </CardHeader>
            <CardContent className="divide-y text-sm">
              {order.items.map((it, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      상품ID: {it.productId} · 수량 {it.quantity}
                    </p>
                  </div>
                  <p className="text-right">
                    <span className="font-semibold">
                      {formatPriceKRW(it.unitPrice * it.quantity)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      @ {formatPriceKRW(it.unitPrice)}
                    </span>
                  </p>
                </div>
              ))}
              <div className="flex justify-between pt-3 text-base font-bold">
                <span>총 결제액</span>
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
            <CardContent className="space-y-1 text-sm">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">결제</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                결제 ID:{" "}
                {order.paymentId ? (
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {order.paymentId}
                  </code>
                ) : (
                  <span className="text-muted-foreground">미연동</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                실제 결제 데이터는 PG 연동 후 자동 채워집니다.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">상태 / 송장</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>주문 상태</Label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ShopOrderStatus)
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>택배사</Label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="">— 선택 —</option>
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>송장번호</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="숫자만"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "저장 중…" : "저장"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
