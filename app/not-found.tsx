import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="text-center">
        <p className="text-6xl font-extrabold text-brand-pink">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          페이지를 찾을 수 없어요.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          주소가 정확한지 확인하시거나, 홈으로 돌아가 다시 둘러봐주세요.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <Link href="/">
            <Button>홈으로</Button>
          </Link>
          <Link href="/products">
            <Button variant="outline">상품 보러가기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
