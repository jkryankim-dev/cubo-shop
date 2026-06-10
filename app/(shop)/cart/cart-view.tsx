"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getCartItems,
  removeFromCart,
  updateCartQuantity,
} from "@/lib/cart";
import { db } from "@/lib/firebase";
import { formatPriceKRW } from "@/lib/format";
import { getBundleUnit, getDisplayPrice } from "@/lib/visibility";
import type { Product, ShopCartItem } from "@/types";

interface CartLine extends ShopCartItem {
  product: Product | null;
}

export default function CartView() {
  const { user, approvedBusiness, loading: authLoading } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const showPrices = !authLoading && approvedBusiness;

  const refresh = useCallback(async () => {
    const items = getCartItems();
    if (items.length === 0) {
      setLines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      setLines(items.map((it) => ({ ...it, product: null })));
      setLoading(false);
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
    setLines(fetched);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("cubo-cart-changed", refresh);
    return () => window.removeEventListener("cubo-cart-changed", refresh);
  }, [refresh]);

  const total = lines.reduce(
    (sum, l) => sum + (l.product ? getDisplayPrice(l.product) : 0) * l.quantity,
    0,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">장바구니</h1>

      {loading ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : lines.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-base font-medium">장바구니가 비어있습니다.</p>
            <p className="text-sm text-muted-foreground">
              마음에 드는 상품을 담아보세요.
            </p>
            <Link href="/products" className="mt-2">
              <Button>상품 보러가기</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={line.productId}>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      {line.product?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.product.imageUrl}
                          alt={line.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      {line.product ? (
                        <>
                          <Link
                            href={`/products/${line.productId}`}
                            className="line-clamp-1 text-sm font-medium hover:underline"
                          >
                            {line.product.name}
                          </Link>
                          {showPrices && (
                            <p className="mt-1 text-sm font-bold text-brand-pink">
                              {formatPriceKRW(getDisplayPrice(line.product))}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          상품 정보 없음 ({line.productId})
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const bu = line.product
                              ? getBundleUnit(line.product)
                              : 1;
                            const next = Math.max(bu, line.quantity - bu);
                            updateCartQuantity(line.productId, next);
                          }}
                        >
                          −
                        </Button>
                        <span className="min-w-8 text-center text-sm">
                          {line.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const bu = line.product
                              ? getBundleUnit(line.product)
                              : 1;
                            updateCartQuantity(
                              line.productId,
                              line.quantity + bu,
                            );
                          }}
                        >
                          +
                        </Button>
                        {line.product && getBundleUnit(line.product) > 1 && (
                          <span className="text-xs text-muted-foreground">
                            ({getBundleUnit(line.product)}개 단위)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {showPrices && (
                        <p className="text-sm font-bold">
                          {formatPriceKRW(
                            (line.product
                              ? getDisplayPrice(line.product)
                              : 0) * line.quantity,
                          )}
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(line.productId)}
                        aria-label="삭제"
                        className="mt-1"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="h-fit">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">주문 요약</h2>
              {showPrices ? (
                <>
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
                    <span className="text-brand-pink">
                      {formatPriceKRW(total)}
                    </span>
                  </div>
                  <Link href="/checkout" className="block">
                    <Button className="w-full" size="lg">
                      결제하기
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="rounded-md border border-dashed border-brand-pink/40 bg-brand-pink/5 p-3 text-center text-xs">
                  <p className="text-sm font-semibold">
                    사업자 승인 회원 전용
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    가격·결제는 사업자등록증 승인 후 표시됩니다.
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    {!user ? (
                      <>
                        <Link href="/login">
                          <Button size="sm" variant="outline">
                            로그인
                          </Button>
                        </Link>
                        <Link href="/signup">
                          <Button size="sm">사업자 회원가입</Button>
                        </Link>
                      </>
                    ) : (
                      <Link href="/mypage/business-license">
                        <Button size="sm">사업자등록증 등록</Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
