"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth/auth-provider";
import { getCartItems } from "@/lib/cart";
import { formatPriceKRW } from "@/lib/format";
import type { ShopCartItem } from "@/types";

export default function CheckoutPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ShopCartItem[]>([]);

  useEffect(() => {
    setItems(getCartItems());
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/checkout");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    );
  }

  if (items.length === 0) {
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

  const defaultAddr = profile?.defaultAddress;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">결제</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        포트원/토스페이먼츠 SDK 연동은 추후 단계 — 지금은 폼 골격입니다.
      </p>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">배송 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>받는 분</Label>
              <Input defaultValue={defaultAddr?.recipient ?? profile?.name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>연락처</Label>
              <Input defaultValue={defaultAddr?.phone ?? profile?.phone ?? ""} />
            </div>
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div className="space-y-1.5">
                <Label>우편번호</Label>
                <Input defaultValue={defaultAddr?.postcode ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>도로명/지번 주소</Label>
                <Input defaultValue={defaultAddr?.address1 ?? ""} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>상세주소</Label>
              <Input defaultValue={defaultAddr?.address2 ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>배송 메모 (선택)</Label>
              <Textarea placeholder="문 앞에 놓아주세요 등" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">결제 수단</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              포트원(PortOne) 또는 토스페이먼츠 SDK 가 들어갈 자리입니다.
            </p>
            <Separator />
            <p className="text-xs text-muted-foreground">
              현재는 데모 — "결제하기" 누르면 더미 주문이 생성될 예정입니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">상품 합계</span>
              <span>{formatPriceKRW(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">배송비</span>
              <span>{formatPriceKRW(0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>총 결제 예정</span>
              <span className="text-brand-pink">{formatPriceKRW(0)}</span>
            </div>
            <Button className="w-full" size="lg" disabled>
              결제하기 (PG 연동 후 활성화)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
