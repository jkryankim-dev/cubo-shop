"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";

import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/shop/product-card";
import { db } from "@/lib/firebase";
import { getCollection } from "@/lib/collections";
import { isShoppableProduct } from "@/lib/visibility";
import type { Product, ShopCollection } from "@/types";

export default function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [coll, setColl] = useState<ShopCollection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const c = await getCollection(slug);
        if (cancelled) return;
        if (!c || !c.isPublic) {
          notFound();
          return;
        }
        setColl(c);

        if (c.productIds.length === 0) {
          setProducts([]);
          return;
        }

        const snap = await getDocs(collection(db, "products"));
        if (cancelled) return;
        const map = new Map(
          snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Product]),
        );
        // 컬렉션의 상품 순서 유지 + ON 필터
        const arranged: Product[] = [];
        for (const pid of c.productIds) {
          const p = map.get(pid);
          if (p && isShoppableProduct(p)) arranged.push(p);
        }
        setProducts(arranged);
      } catch (err) {
        if (!cancelled) console.error("[collection]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-64" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!coll) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{coll.name}</h1>
        {coll.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {coll.description}
          </p>
        )}
      </header>

      {products.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-base font-semibold">
            아직 등록된 상품이 없습니다.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            관리자가 상품을 추가하면 자동으로 표시됩니다.
          </p>
        </div>
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
