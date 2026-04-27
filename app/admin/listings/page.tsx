"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import { getAllListings, upsertListing } from "@/lib/listings";
import { formatPriceKRW } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product, ShopListing } from "@/types";

interface Row {
  product: Product;
  listing: ShopListing | null;
}

type SortKey = "name" | "priceA" | "stock" | "order";

export default function AdminListingsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string>("__all__");
  const [showOnly, setShowOnly] = useState<"all" | "published" | "unpublished">(
    "all",
  );
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

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
          .map((p) => ({ product: p, listing: listings.get(p.id) ?? null }));
        setRows(next);
      } catch (err) {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : "데이터 로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.product.category && set.add(r.product.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [rows]);

  const filtered = useMemo(() => {
    let arr = rows;
    if (category !== "__all__") {
      arr = arr.filter((r) =>
        category === "__none__"
          ? !r.product.category
          : r.product.category === category,
      );
    }
    if (showOnly === "published")
      arr = arr.filter((r) => r.listing?.published === true);
    else if (showOnly === "unpublished")
      arr = arr.filter((r) => r.listing?.published !== true);
    if (filter) {
      const q = filter.toLowerCase();
      arr = arr.filter(
        (r) =>
          r.product.name?.toLowerCase().includes(q) ||
          r.product.id.toLowerCase().includes(q),
      );
    }
    arr = [...arr].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return (a.product.name ?? "").localeCompare(
            b.product.name ?? "",
            "ko",
          );
        case "priceA":
          return (a.product.priceA ?? 0) - (b.product.priceA ?? 0);
        case "stock":
          return (a.product.stock ?? 0) - (b.product.stock ?? 0);
        case "order":
        default: {
          const oa = a.listing?.order ?? Number.MAX_SAFE_INTEGER;
          const ob = b.listing?.order ?? Number.MAX_SAFE_INTEGER;
          if (oa !== ob) return oa - ob;
          return (a.product.name ?? "").localeCompare(
            b.product.name ?? "",
            "ko",
          );
        }
      }
    });
    return arr;
  }, [rows, category, showOnly, filter, sortKey]);

  function patchRow(productId: string, patch: Partial<ShopListing>) {
    setRows((prev) =>
      prev.map((r) =>
        r.product.id === productId
          ? {
              ...r,
              listing: {
                ...(r.listing ?? { productId, published: false }),
                productId,
                ...patch,
              },
            }
          : r,
      ),
    );
  }

  async function togglePublish(productId: string, current: boolean) {
    if (!user) return;
    setSavingId(productId);
    try {
      await upsertListing({
        productId,
        published: !current,
        adminUid: user.uid,
      });
      patchRow(productId, { published: !current });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSavingId(null);
    }
  }

  async function changeOrder(productId: string, value: string) {
    if (!user) return;
    const order = value === "" ? undefined : Number(value);
    if (order !== undefined && Number.isNaN(order)) return;
    setSavingId(productId);
    try {
      await upsertListing({
        productId,
        published:
          rows.find((r) => r.product.id === productId)?.listing?.published ??
          false,
        order,
        adminUid: user.uid,
      });
      patchRow(productId, { order });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSavingId(null);
    }
  }

  function toggleSelected(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.product.id)));
    }
  }

  async function bulkPublish(value: boolean) {
    if (!user || selected.size === 0) return;
    if (
      !window.confirm(
        `선택한 ${selected.size}개 상품을 ${value ? "노출" : "비노출"} 처리할까요?`,
      )
    )
      return;
    setBulkSaving(true);
    try {
      await Promise.all(
        Array.from(selected).map((productId) =>
          upsertListing({
            productId,
            published: value,
            adminUid: user.uid,
          }),
        ),
      );
      Array.from(selected).forEach((id) => patchRow(id, { published: value }));
      toast.success(`${selected.size}개 처리 완료`);
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "일괄 저장 실패");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">상품 노출 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ERP <code>products</code> 의 각 상품을 쇼핑몰에 노출할지 결정합니다.
            노출 순서 (작은 값이 먼저) 도 함께 관리합니다.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="__all__">카테고리 — 전체</option>
          <option value="__none__">미분류</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={showOnly}
          onChange={(e) =>
            setShowOnly(e.target.value as "all" | "published" | "unpublished")
          }
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="all">노출 — 전체</option>
          <option value="published">노출 중만</option>
          <option value="unpublished">비노출만</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="order">정렬: 노출 순서</option>
          <option value="name">정렬: 이름</option>
          <option value="priceA">정렬: 단가</option>
          <option value="stock">정렬: 재고</option>
        </select>
        <Input
          type="search"
          placeholder="상품명/ID 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="ml-auto max-w-xs"
        />
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2 text-sm">
          <span>{selected.size}개 선택됨</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={bulkSaving}
              onClick={() => bulkPublish(true)}
            >
              일괄 노출
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkSaving}
              onClick={() => bulkPublish(false)}
            >
              일괄 비노출
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              선택 해제
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              일치하는 상품이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 py-3 pl-4">
                      <input
                        type="checkbox"
                        checked={
                          selected.size > 0 &&
                          selected.size === filtered.length
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="py-3 pr-2">상품명</th>
                    <th className="py-3 pr-2">카테고리</th>
                    <th className="py-3 pr-2">단가</th>
                    <th className="py-3 pr-2">재고</th>
                    <th className="py-3 pr-2">ERP</th>
                    <th className="py-3 pr-2">순서</th>
                    <th className="py-3 pr-4">노출</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(({ product, listing }) => {
                    const erpHidden =
                      product.hidden === true || product.isDeleted === true;
                    const published = listing?.published === true;
                    const order = listing?.order;
                    return (
                      <tr key={product.id}>
                        <td className="py-3 pl-4">
                          <input
                            type="checkbox"
                            checked={selected.has(product.id)}
                            onChange={() => toggleSelected(product.id)}
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <div className="font-medium">{product.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {product.id}
                          </div>
                        </td>
                        <td className="py-3 pr-2 text-xs text-muted-foreground">
                          {product.category ?? "—"}
                        </td>
                        <td className="py-3 pr-2">
                          {formatPriceKRW(product.priceA ?? 0)}
                        </td>
                        <td
                          className={cn(
                            "py-3 pr-2",
                            (product.stock ?? 0) <= 0
                              ? "text-destructive"
                              : "",
                          )}
                        >
                          {product.stock ?? 0}
                        </td>
                        <td className="py-3 pr-2">
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
                        <td className="py-3 pr-2">
                          <Input
                            type="number"
                            value={order ?? ""}
                            onChange={(e) =>
                              changeOrder(product.id, e.target.value)
                            }
                            className="h-8 w-20 text-sm"
                            placeholder="—"
                            disabled={!published}
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <Button
                            size="sm"
                            variant={published ? "default" : "outline"}
                            disabled={erpHidden || savingId === product.id}
                            onClick={() => togglePublish(product.id, published)}
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
