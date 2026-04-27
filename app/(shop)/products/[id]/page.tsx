"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/firebase";
import { addToCart } from "@/lib/cart";
import { formatPriceKRW } from "@/lib/format";
import type { Product } from "@/types";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "products", id));
        if (cancelled) return;
        if (!snap.exists()) {
          setError("존재하지 않는 상품입니다.");
        } else {
          const data = snap.data() as Product;
          if (data.isDeleted || data.hidden) {
            setError("표시할 수 없는 상품입니다.");
          } else {
            setProduct({ ...data, id: snap.id });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "상품 로드 실패");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-base font-medium">
          {error ?? "상품을 찾을 수 없습니다."}
        </p>
      </div>
    );
  }

  const mainImage = product.image ?? product.images?.[0];
  const detailImages = product.detailImages ?? [];
  const soldOut = (product.stock ?? 0) <= 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImage}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              이미지 없음
            </div>
          )}
        </div>

        <div className="space-y-4">
          {product.category && (
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {product.category}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {product.name}
          </h1>
          <p className="text-3xl font-extrabold text-brand-pink">
            {formatPriceKRW(product.priceA ?? 0)}
          </p>
          {product.description && (
            <p className="text-sm leading-6 text-foreground/80">
              {product.description}
            </p>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">수량</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </Button>
              <span className="min-w-8 text-center text-sm">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={soldOut}
                onClick={() => addToCart(product.id, quantity)}
              >
                장바구니
              </Button>
              <Button className="flex-1" disabled={soldOut}>
                바로 구매
              </Button>
            </div>
            {soldOut && (
              <p className="text-sm text-destructive">
                현재 품절 — 재입고 알림은 추후 단계에서 추가 예정.
              </p>
            )}
          </div>
        </div>
      </div>

      {detailImages.length > 0 && (
        <section className="mt-12 space-y-4">
          <h2 className="text-xl font-bold tracking-tight">상품 상세</h2>
          <div className="space-y-4">
            {detailImages.map((src, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={idx}
                src={src}
                alt={`${product.name} 상세 ${idx + 1}`}
                className="w-full"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
