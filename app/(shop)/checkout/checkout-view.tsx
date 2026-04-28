"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import { clearCart, getCartItems } from "@/lib/cart";
import { formatPriceKRW } from "@/lib/format";
import { getDisplayPrice, isShoppableProduct } from "@/lib/visibility";
import { createPendingOrderAction } from "@/lib/actions/checkout";
import type { Product, ShopCartItem } from "@/types";

interface Line extends ShopCartItem {
  product: Product | null;
}

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";

export default function CheckoutView() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/checkout");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!profile) return;
    setRecipient(profile.defaultAddress?.recipient ?? profile.name);
    setPhone(profile.defaultAddress?.phone ?? profile.phone);
    setPostcode(profile.defaultAddress?.postcode ?? "");
    setAddress1(profile.defaultAddress?.address1 ?? "");
    setAddress2(profile.defaultAddress?.address2 ?? "");
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const items = getCartItems();
      if (items.length === 0) {
        setLines([]);
        setLoadingProducts(false);
        return;
      }
      const fetched = await Promise.all(
        items.map(async (it) => {
          try {
            const snap = await getDoc(doc(db, "products", it.productId));
            if (!snap.exists()) return { ...it, product: null };
            return {
              ...it,
              product: { id: snap.id, ...snap.data() } as Product,
            };
          } catch {
            return { ...it, product: null };
          }
        }),
      );
      if (!cancelled) {
        setLines(fetched);
        setLoadingProducts(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, l) =>
          sum + (l.product ? getDisplayPrice(l.product) : 0) * l.quantity,
        0,
      ),
    [lines],
  );

  const orderName = useMemo(() => {
    if (lines.length === 0) return "주문";
    const first = lines[0].product?.name ?? "주문";
    return lines.length > 1 ? `${first} 외 ${lines.length - 1}건` : first;
  }, [lines]);

  const hasUnshoppable = lines.some(
    (l) => l.product && !isShoppableProduct(l.product),
  );

  async function handlePay() {
    if (!user) return;
    if (!TOSS_CLIENT_KEY) {
      toast.error(
        "결제 환경변수 (NEXT_PUBLIC_TOSS_CLIENT_KEY) 가 비어있어요. 토스페이먼츠 키를 채워주세요.",
      );
      return;
    }
    if (!recipient.trim() || !phone.trim() || !postcode.trim() || !address1.trim()) {
      toast.error("배송 정보를 모두 입력해주세요.");
      return;
    }
    if (hasUnshoppable) {
      toast.error("판매 중지된 상품이 포함되어 있습니다. 장바구니에서 제거 후 다시 시도해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const result = await createPendingOrderAction({
        idToken,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        shippingAddress: {
          recipient: recipient.trim(),
          phone: phone.trim(),
          postcode: postcode.trim(),
          address1: address1.trim(),
          address2: address2.trim() || undefined,
          memo: memo.trim() || undefined,
        },
      });
      if (!result.success || !result.data) {
        toast.error(result.message);
        setSubmitting(false);
        return;
      }

      // 토스페이먼츠 결제창 호출
      const toss = await loadTossPayments(TOSS_CLIENT_KEY);
      await toss.requestPayment("카드", {
        amount: result.data.amount,
        orderId: result.data.orderId,
        orderName: result.data.orderName,
        customerName: profile?.name ?? "",
        customerEmail: profile?.email ?? "",
        successUrl: `${window.location.origin}/order/success`,
        failUrl: `${window.location.origin}/order/fail`,
      });
      // requestPayment 가 페이지 이동을 일으키므로 아래 코드는 보통 도달하지 않음
      clearCart();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "결제 요청 실패");
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!loadingProducts && lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p>장바구니가 비어있어 결제를 진행할 수 없습니다.</p>
            <Link href="/products">
              <Button>상품 보러가기</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">결제</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        결제 후 6시간 이내 입금 완료되지 않으면 자동 취소됩니다.
      </p>

      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">주문 상품</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <ul className="divide-y text-sm">
                {lines.map((l) => (
                  <li
                    key={l.productId}
                    className="flex justify-between py-2"
                  >
                    <span>
                      {l.product?.name ?? l.productId}
                      <span className="ml-1 text-muted-foreground">
                        × {l.quantity}
                      </span>
                    </span>
                    <span>
                      {formatPriceKRW(
                        (l.product ? getDisplayPrice(l.product) : 0) * l.quantity,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">배송 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>받는 분</Label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>연락처</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div className="space-y-1.5">
                <Label>우편번호</Label>
                <Input
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>도로명/지번 주소</Label>
                <Input
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>상세주소</Label>
              <Input
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>배송 메모 (선택)</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="문 앞에 놓아주세요 등"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">상품 합계</span>
              <span>{formatPriceKRW(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">배송비</span>
              <span>주문 시 산출</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>총 결제 예정</span>
              <span className="text-brand-pink">{formatPriceKRW(total)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handlePay}
              disabled={submitting || loadingProducts || total === 0}
            >
              {submitting ? "결제 요청 중…" : `${formatPriceKRW(total)} 결제하기`}
            </Button>
            <p className="text-xs text-muted-foreground">
              평일 오후 2시 이전 결제 확정 건은 당일 출고를 원칙으로 합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
