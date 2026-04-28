"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import DaumPostcode, { type Address } from "react-daum-postcode";
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
import { signInAsGuest } from "@/lib/auth";
import { clearCart, getCartItems } from "@/lib/cart";
import { formatPriceKRW, formatPhone } from "@/lib/format";
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

  // === GUEST_CHECKOUT (토스 승인 후 제거) ===
  // 비회원이 진입하면 한 번 자동으로 익명 로그인.
  // Firebase Anonymous Auth 가 콘솔에서 활성화되어 있어야 함.
  // 토스 승인 후 회원 전용으로 회귀 시:
  //   1. 본 useEffect 블록 제거
  //   2. 아래 isGuest 분기 제거
  //   3. !user 시 router.replace("/login?redirect=/checkout") 로 변경
  const [guestSignInAttempted, setGuestSignInAttempted] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (guestSignInAttempted) return;
    setGuestSignInAttempted(true);
    signInAsGuest().catch((err) => {
      console.error("[guest-checkout] anonymous sign-in failed", err);
      toast.error(
        "비회원 결제 환경 준비에 실패했어요. 로그인 후 다시 시도해주세요.",
      );
      router.replace("/login?redirect=/checkout");
    });
  }, [loading, user, guestSignInAttempted, router]);
  const isGuest = !!user && user.isAnonymous;
  // === GUEST_CHECKOUT END ===

  // 주문자 정보 (회원이면 프로필 자동 채움, 비회원이면 직접 입력)
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  // 배송 정보
  const [recipient, setRecipient] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [memo, setMemo] = useState("");
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [sameAsBuyer, setSameAsBuyer] = useState(true);

  // 회원 프로필 → 폼 초기 채움
  useEffect(() => {
    if (!profile) return;
    setBuyerName(profile.name);
    setBuyerPhone(profile.phone);
    setBuyerEmail(profile.email);
    setRecipient(profile.defaultAddress?.recipient ?? profile.name);
    setShipPhone(profile.defaultAddress?.phone ?? profile.phone);
    setPostcode(profile.defaultAddress?.postcode ?? "");
    setAddress1(profile.defaultAddress?.address1 ?? "");
    setAddress2(profile.defaultAddress?.address2 ?? "");
  }, [profile]);

  // 받는 분 = 주문자 자동 동기화
  useEffect(() => {
    if (sameAsBuyer) {
      setRecipient(buyerName);
      setShipPhone(buyerPhone);
    }
  }, [sameAsBuyer, buyerName, buyerPhone]);

  // 장바구니 상품 fetch
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

  function handlePostcodeComplete(data: Address) {
    setPostcode(data.zonecode);
    setAddress1(data.roadAddress || data.jibunAddress);
    setPostcodeOpen(false);
  }

  async function handlePay() {
    if (!user) return;
    if (!TOSS_CLIENT_KEY) {
      toast.error(
        "결제 환경변수 (NEXT_PUBLIC_TOSS_CLIENT_KEY) 가 비어있어요. 토스페이먼츠 키를 채워주세요.",
      );
      return;
    }
    if (!buyerName.trim() || !buyerPhone.trim() || !buyerEmail.trim()) {
      toast.error("주문자 정보(이름·전화·이메일)를 모두 입력해주세요.");
      return;
    }
    if (
      !recipient.trim() ||
      !shipPhone.trim() ||
      !postcode.trim() ||
      !address1.trim()
    ) {
      toast.error("배송 정보를 모두 입력해주세요.");
      return;
    }
    if (hasUnshoppable) {
      toast.error(
        "판매 중지된 상품이 포함되어 있습니다. 장바구니에서 제거 후 다시 시도해주세요.",
      );
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
          phone: shipPhone.trim(),
          postcode: postcode.trim(),
          address1: address1.trim(),
          address2: address2.trim() || undefined,
          memo: memo.trim() || undefined,
        },
        buyerInfo: {
          name: buyerName.trim(),
          phone: buyerPhone.trim(),
          email: buyerEmail.trim(),
        },
      });
      if (!result.success || !result.data) {
        toast.error(result.message);
        setSubmitting(false);
        return;
      }

      // 토스 SDK 는 client 에서만 로드 (SSR 시 모듈 로드 회피)
      const { ANONYMOUS, loadTossPayments } = await import(
        "@tosspayments/tosspayments-sdk"
      );
      const toss = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = toss.payment({ customerKey: ANONYMOUS });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: result.data.amount },
        orderId: result.data.orderId,
        orderName: result.data.orderName,
        successUrl: `${window.location.origin}/order/success`,
        failUrl: `${window.location.origin}/order/fail`,
        customerEmail: buyerEmail.trim() || undefined,
        customerName: buyerName.trim() || undefined,
        customerMobilePhone: buyerPhone.replace(/-/g, "") || undefined,
      });
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

      {/* === GUEST_CHECKOUT (토스 승인 후 제거) === */}
      {isGuest && (
        <Card className="mt-4 border-brand-pink/40 bg-brand-pink/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <span>
              <strong>비회원 주문</strong> 으로 진행 중입니다. 회원이면 적립금/주문 내역
              관리에 더 편해요.
            </span>
            <Link
              href="/login?redirect=/checkout"
              className="font-medium text-brand-pink hover:underline"
            >
              로그인 →
            </Link>
          </CardContent>
        </Card>
      )}
      {/* === GUEST_CHECKOUT END === */}

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
                  <li key={l.productId} className="flex justify-between py-2">
                    <span>
                      {l.product?.name ?? l.productId}
                      <span className="ml-1 text-muted-foreground">
                        × {l.quantity}
                      </span>
                    </span>
                    <span>
                      {formatPriceKRW(
                        (l.product ? getDisplayPrice(l.product) : 0) *
                          l.quantity,
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
            <CardTitle className="text-lg">주문자 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>성함 *</Label>
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>휴대폰번호 *</Label>
              <Input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(formatPhone(e.target.value))}
                maxLength={13}
              />
            </div>
            <div className="space-y-1.5">
              <Label>이메일 *</Label>
              <Input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="결제·배송 안내 발송"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">배송 정보</CardTitle>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sameAsBuyer}
                onChange={(e) => setSameAsBuyer(e.target.checked)}
              />
              주문자와 동일
            </label>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>받는 분</Label>
              <Input
                value={recipient}
                onChange={(e) => {
                  setSameAsBuyer(false);
                  setRecipient(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>연락처</Label>
              <Input
                value={shipPhone}
                onChange={(e) => {
                  setSameAsBuyer(false);
                  setShipPhone(formatPhone(e.target.value));
                }}
                maxLength={13}
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={postcode}
                readOnly
                placeholder="우편번호"
                className="max-w-[140px]"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPostcodeOpen((v) => !v)}
              >
                {postcodeOpen ? "닫기" : "우편번호 검색"}
              </Button>
            </div>
            {postcodeOpen && (
              <div className="overflow-hidden rounded-md border">
                <DaumPostcode
                  onComplete={handlePostcodeComplete}
                  style={{ height: 360 }}
                />
              </div>
            )}
            <Input
              value={address1}
              readOnly
              placeholder="도로명/지번 주소"
            />
            <Input
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="상세주소"
            />
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
              {submitting
                ? "결제 요청 중…"
                : `${formatPriceKRW(total)} 결제하기`}
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
