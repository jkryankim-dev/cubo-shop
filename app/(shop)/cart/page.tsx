"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getCartItems,
  removeFromCart,
  updateCartQuantity,
} from "@/lib/cart";
import { formatPriceKRW } from "@/lib/format";
import type { ShopCartItem } from "@/types";

export default function CartPage() {
  const [items, setItems] = useState<ShopCartItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(getCartItems());
    refresh();
    window.addEventListener("cubo-cart-changed", refresh);
    return () => window.removeEventListener("cubo-cart-changed", refresh);
  }, []);

  // 가격 정보는 ERP products 와 join 해야 정확. 지금은 골격만.
  const total = 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">장바구니</h1>

      {items.length === 0 ? (
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
            {items.map((item) => (
              <li key={item.productId}>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="size-20 shrink-0 rounded-md bg-muted" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        상품 ID: {item.productId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        상품 정보 join 은 추후 단계
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateCartQuantity(
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                        >
                          −
                        </Button>
                        <span className="min-w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateCartQuantity(
                              item.productId,
                              item.quantity + 1,
                            )
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.productId)}
                      aria-label="삭제"
                    >
                      <Trash2 />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="h-fit">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">주문 요약</h2>
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
              <Link href="/checkout" className="block">
                <Button className="w-full" size="lg">
                  결제하기
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
