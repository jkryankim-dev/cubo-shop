import Link from "next/link";
import { Boxes, Truck, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div>
      <section className="bg-brand-mint/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-pink">
              인형뽑기 매장 굿즈 도매
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              매장에서 검증된 굿즈,
              <br />
              <span className="text-brand-pink">도매가로 채워보세요.</span>
            </h1>
            <p className="mt-5 text-base leading-7 text-foreground/80 md:text-lg">
              CUBO 매장에서 실제로 잘 나가는 인기 굿즈를 사장님들께
              합리적인 도매가로 공급합니다. 사업자등록증만 등록하시면
              사업자 회원 단가가 적용됩니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products">
                <Button size="lg">상품 카탈로그</Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline">
                  사업자 회원가입
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          왜 CUBO 인가요
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Feature
            icon={<Boxes className="size-5 text-brand-pink" />}
            title="매장 검증 인기 굿즈"
            body="실제 CUBO 매장에서 회전이 빠른 상품만 엄선해 공급합니다."
          />
          <Feature
            icon={<Truck className="size-5 text-brand-pink" />}
            title="전국 빠른 택배 배송"
            body="평일 오후 2시 이전 주문은 당일 출고를 원칙으로 합니다."
          />
          <Feature
            icon={<ShieldCheck className="size-5 text-brand-pink" />}
            title="사업자 회원 도매가"
            body="사업자등록증 검토 후 사업자 단가가 자동 적용됩니다."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          이번 주 추천
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          관리자가 큐레이션한 인기 상품이 곧 노출됩니다.
        </p>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
