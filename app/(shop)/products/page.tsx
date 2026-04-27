"use client";

import { useEffect, useState } from "react";

import { ProductCard } from "@/components/shop/product-card";
import { getPublicProducts } from "@/lib/products";
import type { Product } from "@/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "상품을 불러오지 못했습니다.";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">전체 상품</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ERP 에 등록된 상품 중 노출 조건을 만족하는 항목만 보여드려요.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">상품을 불러오는 중…</p>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">상품을 불러오지 못했어요.</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center">
      <p className="text-base font-semibold">표시할 상품이 없습니다.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Firebase 환경변수(<code>.env.local</code>)가 채워져 있고,
        <br />
        ERP 의 <code>products</code> 컬렉션에 노출 가능한 상품이 있는지 확인해주세요.
      </p>
    </div>
  );
}
