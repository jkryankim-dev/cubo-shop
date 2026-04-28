"use client";

import { use, useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";

import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/shop/product-card";
import { db } from "@/lib/firebase";
import { getCollection } from "@/lib/collections";
import { getDisplayPrice, isShoppableProduct } from "@/lib/visibility";
import type { Product, ShopCollection } from "@/types";

type SortKey = "curated" | "name" | "priceAsc" | "priceDesc" | "newest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "curated", label: "추천 순" },
  { value: "name", label: "이름 순" },
  { value: "priceAsc", label: "가격 낮은 순" },
  { value: "priceDesc", label: "가격 높은 순" },
  { value: "newest", label: "최신 등록" },
];

export default function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [coll, setColl] = useState<ShopCollection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("curated");

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

  const sorted = useMemo(() => {
    const arr = [...products];
    switch (sortKey) {
      case "name":
        return arr.sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", "ko"),
        );
      case "priceAsc":
        return arr.sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b));
      case "priceDesc":
        return arr.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
      case "newest":
        return arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      case "curated":
      default:
        return arr;
    }
  }, [products, sortKey]);

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
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{coll.name}</h1>
          {coll.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {coll.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            상품 {sorted.length}개
          </p>
        </div>

        {sorted.length > 1 && (
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </header>

      {sorted.length === 0 ? (
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
          {sorted.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
