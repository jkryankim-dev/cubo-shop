"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import { ProductCard } from "@/components/shop/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { FEATURED_COLLECTION_ID, getCollection } from "@/lib/collections";
import { getSafetyStockMap } from "@/lib/safety-stocks";
import { isShoppableProduct } from "@/lib/visibility";
import type { Product } from "@/types";

/** 메인 페이지의 "추천 상품" 그리드.
 *
 * `shop_collections/featured` 컬렉션에 등록된 상품을 productIds 순서대로 노출합니다.
 * 해당 컬렉션이 없거나 노출 가능한 상품이 없으면 안내 메시지를 띄웁니다.
 */
export function FeaturedCollections() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const c = await getCollection(FEATURED_COLLECTION_ID);
        if (cancelled) return;
        if (!c || !c.isPublic || c.productIds.length === 0) {
          setProducts([]);
          return;
        }
        const [productSnap, safetyMap] = await Promise.all([
          getDocs(collection(db, "products")),
          getSafetyStockMap(),
        ]);
        if (cancelled) return;
        const map = new Map(
          productSnap.docs.map(
            (d) => [d.id, { id: d.id, ...d.data() } as Product] as const,
          ),
        );
        const arranged: Product[] = [];
        for (const pid of c.productIds) {
          const p = map.get(pid);
          if (!p) continue;
          const withSafety: Product = {
            ...p,
            safetyStock: safetyMap.get(p.id) ?? 0,
          };
          if (isShoppableProduct(withSafety)) arranged.push(withSafety);
        }
        setProducts(arranged);
      } catch (err) {
        if (!cancelled) console.error("[featured]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        관리자가 홈 추천 컬렉션에 상품을 등록하면 이 자리에 표시됩니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
