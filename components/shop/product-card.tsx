"use client";

import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { formatPriceKRW } from "@/lib/format";
import { getBundleUnit, getDisplayPrice, isSoldOut } from "@/lib/visibility";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const { approvedBusiness, loading } = useAuth();
  const image = product.imageUrl;
  const soldOut = isSoldOut(product);
  const bundleUnit = getBundleUnit(product);

  return (
    <Link href={`/products/${product.id}`} className="group">
      <Card className="overflow-hidden transition-shadow group-hover:shadow-lg">
        <div className="relative aspect-square w-full bg-muted">
          {image ? (
            // ERP 의 이미지 URL 도메인이 다양해서 next/image remotePatterns 화이트리스트
            // 부담을 피하려고 일단 <img> 사용. 운영 직전 next.config 정리 후 next/image 로 교체 예정.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              이미지 없음
            </div>
          )}
          {soldOut && (
            <span className="absolute left-2 top-2 rounded-md bg-foreground/80 px-2 py-0.5 text-xs font-semibold text-background">
              품절
            </span>
          )}
        </div>
        <CardContent className="space-y-1 p-3">
          <p className="line-clamp-2 text-sm font-medium text-foreground/90">
            {product.name}
          </p>
          {/* 사업자 도매가는 사업자등록증 승인 회원에게만 노출.
              비로그인·일반 회원·승인 대기 회원·로딩 중에는 아예 렌더 안 함. */}
          {!loading && approvedBusiness && (
            <p className="text-base font-bold text-brand-pink">
              {formatPriceKRW(getDisplayPrice(product))}
              {bundleUnit > 1 && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {bundleUnit}개
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
