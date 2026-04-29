"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/shop/product-card";
import { db } from "@/lib/firebase";
import { isShoppableProduct } from "@/lib/visibility";
import { listCollections } from "@/lib/collections";
import type { Product, ShopCollection } from "@/types";

export default function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get("q") ?? "";

  const [q, setQ] = useState(initialQ);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<ShopCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [snap, cols] = await Promise.all([
          getDocs(collection(db, "products")),
          listCollections({ publicOnly: true }),
        ]);
        if (cancelled) return;
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => isShoppableProduct(p));
        // 컬렉션 등록된 상품만 (카탈로그와 동일 정책)
        const exposedIds = new Set<string>();
        for (const c of cols) for (const pid of c.productIds) exposedIds.add(pid);
        setProducts(list.filter((p) => exposedIds.has(p.id)));
        setCollections(cols);
      } catch (err) {
        console.error("[search] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedQ = initialQ.trim().toLowerCase();
  const matchedProducts = useMemo(() => {
    if (!trimmedQ) return [] as Product[];
    return products
      .filter((p) => {
        return (
          p.name?.toLowerCase().includes(trimmedQ) ||
          p.spec?.toLowerCase().includes(trimmedQ) ||
          p.category?.toLowerCase().includes(trimmedQ) ||
          p.barcode?.toLowerCase().includes(trimmedQ)
        );
      })
      .slice(0, 60);
  }, [products, trimmedQ]);

  const matchedCollections = useMemo(() => {
    if (!trimmedQ) return [] as ShopCollection[];
    return collections
      .filter(
        (c) =>
          c.name.toLowerCase().includes(trimmedQ) ||
          c.id.toLowerCase().includes(trimmedQ),
      )
      .slice(0, 6);
  }, [collections, trimmedQ]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = q.trim();
    if (!next) return;
    router.push(`/search?q=${encodeURIComponent(next)}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">상품 검색</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex max-w-xl gap-2">
        <Input
          type="search"
          placeholder="상품명·카테고리·바코드"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit">
          <Search className="mr-1 size-4" /> 검색
        </Button>
      </form>

      {!trimmedQ ? (
        <p className="mt-10 text-sm text-muted-foreground">
          검색어를 입력해주세요.
        </p>
      ) : loading ? (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      ) : matchedProducts.length === 0 && matchedCollections.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          &quot;{initialQ}&quot; 와 일치하는 결과가 없습니다.
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {matchedCollections.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">관련 컬렉션</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {matchedCollections.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`/collections/${c.id}`}
                      className="rounded-full border border-border bg-background px-3 py-1 text-sm transition-colors hover:bg-accent/40"
                    >
                      {c.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {matchedProducts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">
                상품 ({matchedProducts.length})
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {matchedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
