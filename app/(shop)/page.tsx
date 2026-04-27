import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div>
      <section className="bg-brand-mint/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-pink">
              인형뽑기 굿즈 공식 쇼핑몰
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              매장에서 만난 그 친구들,
              <br />
              <span className="text-brand-pink">집에서도 만나요.</span>
            </h1>
            <p className="mt-5 text-base leading-7 text-foreground/80 md:text-lg">
              CUBO 매장에서 인기 있는 굿즈를 엄선해 온라인으로 만나보세요.
              빠른 배송, 안전한 결제.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products">
                <Button size="lg">상품 보러가기</Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline">
                  CUBO 매장 소개
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          이번 주 추천
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          상품 데이터는 6단계에서 Firestore 와 연결됩니다.
        </p>
      </section>
    </div>
  );
}
