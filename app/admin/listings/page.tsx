"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Eye, EyeOff, Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import {
  FEATURED_COLLECTION_ID,
  createCollection,
  isFeaturedCollection,
  listCollections,
} from "@/lib/collections";
import { db } from "@/lib/firebase";
import type { Product, ShopCollection } from "@/types";

export default function AdminCollectionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [collections, setCollections] = useState<ShopCollection[]>([]);
  const [productMap, setProductMap] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [creatingFeatured, setCreatingFeatured] = useState(false);

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

  const featuredCollection = useMemo(
    () => collections.find(isFeaturedCollection) ?? null,
    [collections],
  );
  const regularCollections = useMemo(
    () => collections.filter((c) => !isFeaturedCollection(c)),
    [collections],
  );

  async function handleCreateFeatured() {
    if (!user) return;
    setCreatingFeatured(true);
    try {
      await createCollection({
        id: FEATURED_COLLECTION_ID,
        name: "홈 추천",
        description: "메인 페이지에 띄울 추천 상품",
        order: 0,
        isPublic: true,
        createdBy: user.uid,
      });
      toast.success("추천 컬렉션이 생성되었습니다.");
      router.push(`/admin/listings/${FEATURED_COLLECTION_ID}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "생성 실패");
      setCreatingFeatured(false);
    }
  }

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
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                홈 추천 컬렉션
              </h2>
              <p className="text-xs text-muted-foreground">
                메인 페이지 추천 영역에 노출 · 다른 컬렉션과 중복 가능
              </p>
            </div>
            {featuredCollection ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <CollectionCard
                  collection={featuredCollection}
                  productMap={productMap}
                />
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="text-sm font-medium">
                    아직 추천 컬렉션이 없어요.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    홈 화면에 띄울 상품을 큐레이션하는 전용 컬렉션을 만들어보세요.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleCreateFeatured}
                    disabled={creatingFeatured}
                  >
                    <Star className="mr-1 size-4" />
                    {creatingFeatured ? "생성 중…" : "추천 컬렉션 만들기"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                일반 컬렉션
              </h2>
              <p className="text-xs text-muted-foreground">
                카테고리·테마 페이지 · 한 상품 = 한 컬렉션
              </p>
            </div>
            {regularCollections.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <p className="text-sm font-medium">
                    아직 만든 일반 컬렉션이 없어요.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    &quot;Event&quot;, &quot;봉제인형&quot;, &quot;가방류&quot;
                    같은 테마 페이지를 만들어보세요.
                  </p>
                  <Link href="/admin/listings/new" className="mt-1">
                    <Button size="sm">
                      <Plus className="mr-1 size-4" />첫 컬렉션 만들기
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {regularCollections.map((c) => (
                  <CollectionCard
                    key={c.id}
                    collection={c}
                    productMap={productMap}
                  />
                ))}
              </div>
            )}
          </section>
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
            {isFeaturedCollection(c) && (
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
