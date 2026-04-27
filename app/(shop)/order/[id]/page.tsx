import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">주문 상세</h1>
      <Card className="mt-8">
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-base font-medium">주문이 접수되었습니다.</p>
          <p className="text-sm text-muted-foreground">
            주문번호:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">{id}</code>
          </p>
          <p className="text-xs text-muted-foreground">
            결제 PG 연동 + Firestore shop_orders 조회는 다음 단계.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/mypage/orders">
              <Button variant="outline">주문 내역</Button>
            </Link>
            <Link href="/products">
              <Button>쇼핑 계속하기</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
