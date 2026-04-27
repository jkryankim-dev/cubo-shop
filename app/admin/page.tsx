import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">관리자 대시보드</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        쇼핑몰 운영을 위한 관리 도구.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/listings">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-base">상품 노출 관리</CardTitle>
              <CardDescription>
                ERP 상품 중 어떤 걸 쇼핑몰에 게시할지 큐레이션
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              shop_listings 컬렉션에 published / featured / order 저장
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base">주문 관리</CardTitle>
            <CardDescription>(추후 단계)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            결제 단계 완성 후 활성화
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base">사업자 회원 검토</CardTitle>
            <CardDescription>(추후 단계)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            사업자등록증 검토 → 승급 처리
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
