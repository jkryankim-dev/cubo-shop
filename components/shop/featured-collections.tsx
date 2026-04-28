"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { listCollections } from "@/lib/collections";
import { isShoppableProduct } from "@/lib/visibility";
import type { Product, ShopCollection } from "@/types";

interface FeaturedRow {
  collection: ShopCollection;
  previews: Product[];
}

export function FeaturedCollections() {
  const [rows, setRows] = useState<FeaturedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const all = await listCollections({ publicOnly: true });
        const featured = all.filter((c) => c.featured);
        if (featured.length === 0) {
          setRows([]);
          return;
        }
        const snap = await getDocs(collection(db, "products"));
        if (cancelled) return;
        const map = new Map(
          snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Product]),
        );
        const next: FeaturedRow[] = featured.map((c) => {
          const previews: Product[] = [];
          for (const pid of c.productIds) {
            const p = map.get(pid);
            if (p && isShoppableProduct(p)) previews.push(p);
            if (previews.length >= 4) break;
          }
          return { collection: c, previews };
        });
        setRows(next.filter((r) => r.previews.length > 0));
      } catch (err) {
        console.error("[featured]", err);
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
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-7 w-40" />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="aspect-square w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        관리자가 컬렉션을 추천 등록하면 이 자리에 자동으로 표시됩니다.
      </p>
    );
  }

  return (
    <div className="space-y-12">
      {rows.map(({ collection: c, previews }) => (
        <section key={c.id}>
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="text-xl font-bold tracking-tight">{c.name}</h3>
            <Link
              href={`/collections/${c.id}`}
              className="flex items-center gap-1 text-sm text-brand-pink hover:underline"
            >
              더 보기 <ArrowRight className="size-3.5" />
            </Link>
          </header>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="group">
                <Card className="overflow-hidden">
                  <div className="aspect-square w-full bg-muted">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-xs font-medium">
                      {p.name}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
