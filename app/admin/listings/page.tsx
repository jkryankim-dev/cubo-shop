"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import { getAllListings, upsertListing } from "@/lib/listings";
import { formatPriceKRW } from "@/lib/format";
import type { Product, ShopListing } from "@/types";

interface Row {
  product: Product;
  listing: ShopListing | null;
}

export default function AdminListingsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [productSnap, listings] = await Promise.all([
          getDocs(collection(db, "products")),
          getAllListings(),
        ]);
        if (cancelled) return;

        const next: Row[] = productSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => p.isDeleted !== true)
          .map((p) => ({ product: p, listing: listings.get(p.id) ?? null }))
          .sort((a, b) =>
            (a.product.name ?? "").localeCompare(b.product.name ?? "", "ko"),
          );
        setRows(next);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "데이터 로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function togglePublish(productId: string, current: boolean) {
    if (!user) return;
    setSavingId(productId);
    try {
      await upsertListing({
        productId,
        published: !current,
        adminUid: user.uid,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.product.id === productId
            ? {
                ...r,
                listing: {
                  ...(r.listing ?? { productId, published: false }),
                  productId,
                  published: !current,
                  listedBy: user.uid,
                },
              }
            : r,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = filter
    ? rows.filter(
        (r) =>
          r.product.name?.toLowerCase().includes(filter.toLowerCase()) ||
          r.product.id.includes(filter),
      )
    : rows;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">상품 노출 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ERP <code>products</code> 의 각 상품을 쇼핑몰에 노출할지 결정합니다.
            ERP 의 hidden / isDeleted 플래그도 함께 존중됩니다.
          </p>
        </div>
        <Input
          type="search"
          placeholder="상품명/ID 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">상품 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              일치하는 상품이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">상품명</th>
                    <th className="py-2 pr-4">단가</th>
                    <th className="py-2 pr-4">재고</th>
                    <th className="py-2 pr-4">ERP 상태</th>
                    <th className="py-2 pr-4">쇼핑몰 노출</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(({ product, listing }) => {
                    const erpHidden =
                      product.hidden === true || product.isDeleted === true;
                    const published = listing?.published === true;
                    return (
                      <tr key={product.id}>
                        <td className="py-3 pr-4">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.id}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {formatPriceKRW(product.priceA ?? 0)}
                        </td>
                        <td className="py-3 pr-4">
                          {product.stock ?? 0}
                        </td>
                        <td className="py-3 pr-4">
                          {erpHidden ? (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs">
                              비공개
                            </span>
                          ) : (
                            <span className="rounded bg-accent/40 px-2 py-0.5 text-xs">
                              공개
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Button
                            size="sm"
                            variant={published ? "default" : "outline"}
                            disabled={
                              erpHidden || savingId === product.id
                            }
                            onClick={() =>
                              togglePublish(product.id, published)
                            }
                          >
                            {savingId === product.id
                              ? "저장 중…"
                              : published
                                ? "노출 중"
                                : "비노출"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
