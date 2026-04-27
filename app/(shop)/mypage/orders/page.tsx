"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MypageOrdersPage() {
  // Firestore shop_orders 조회는 결제 단계 가서 연결.
  const orders: Array<{ id: string; status: string; total: number }> = [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 내역</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              주문 내역이 없습니다.
            </p>
            <Link href="/products">
              <Button variant="outline">상품 보러가기</Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
            {orders.map((o) => (
              <li key={o.id} className="py-3 text-sm">
                {o.id} — {o.status}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
