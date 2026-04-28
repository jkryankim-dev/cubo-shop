"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Eye, EyeOff, Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listCollections } from "@/lib/collections";
import { db } from "@/lib/firebase";
import type { Product, ShopCollection } from "@/types";

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<ShopCollection[]>([]);
  const [productMap, setProductMap] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [items, productSnap] = await Promise.all([
          listCollections(),
          getDocs(collection(db, "products")),
        ]);
        if (cancelled) return;
        setCollections(items);
        const map = new Map<string, Product>();
        productSnap.docs.forEach((d) => {
          map.set(d.id, { id: d.id, ...d.data() } as Product);
        });
        setProductMap(map);
      } catch (err) {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : "조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">상품 노출 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            카테고리/이벤트 페이지 (컬렉션) 를 만들고, 각 페이지에 노출할 상품을
            선택하세요. 실제 노출은 ERP 의 <strong>&apos;ON&apos; 태그</strong>{" "}
            가 함께 있어야 활성화됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products-status">
            <Button variant="outline" size="sm">
              ON 태그 현황
            </Button>
          </Link>
          <Link href="/admin/listings/new">
            <Button size="sm">
              <Plus className="mr-1 size-4" />새 컬렉션
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-base font-medium">
              아직 만든 컬렉션이 없어요.
            </p>
            <p className="text-sm text-muted-foreground">
              &quot;Event&quot;, &quot;봉제인형&quot;, &quot;가방류&quot; 같은
              테마 페이지를 만들어보세요.
            </p>
            <Link href="/admin/listings/new" className="mt-2">
              <Button>
                <Plus className="mr-1 size-4" />첫 컬렉션 만들기
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              productMap={productMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionCard({
  collection: c,
  productMap,
}: {
  collection: ShopCollection;
  productMap: Map<string, Product>;
}) {
  const previews = useMemo(() => {
    const arr: Product[] = [];
    for (const pid of c.productIds.slice(0, 4)) {
      const p = productMap.get(pid);
      if (p) arr.push(p);
    }
    return arr;
  }, [c.productIds, productMap]);

  return (
    <Link href={`/admin/listings/${c.id}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="grid grid-cols-4 gap-px bg-border">
          {Array.from({ length: 4 }).map((_, i) => {
            const p = previews[i];
            return (
              <div
                key={i}
                className="aspect-square bg-background"
              >
                {p?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-base">
            {c.name}
            {c.featured && (
              <Star className="ml-1.5 inline size-3.5 fill-brand-pink text-brand-pink" />
            )}
          </CardTitle>
          {c.isPublic ? (
            <Eye className="size-4 text-brand-mint" />
          ) : (
            <EyeOff className="size-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p className="font-mono">/{c.id}</p>
          <p>
            상품 <strong>{c.productIds.length}</strong>개 · 정렬 {c.order}
          </p>
          {c.description && (
            <p className="line-clamp-2 text-foreground/80">
              {c.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
