"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { formatPriceKRW } from "@/lib/format";
import { getDisplayPrice, isShoppableProduct } from "@/lib/visibility";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

type SortKey = "name" | "priceA" | "stock" | "createdAt";

export default function AdminListingsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string>("__all__");
  const [showOnly, setShowOnly] = useState<"all" | "on" | "off">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const productSnap = await getDocs(collection(db, "products"));
        if (cancelled) return;
        const next = productSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => p.isDeleted !== true);
        setProducts(next);
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
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [products]);

  const filtered = useMemo(() => {
    let arr = products;
    if (category !== "__all__") {
      arr = arr.filter((p) =>
        category === "__none__" ? !p.category : p.category === category,
      );
    }
    if (showOnly === "on") arr = arr.filter((p) => isShoppableProduct(p));
    else if (showOnly === "off")
      arr = arr.filter((p) => !isShoppableProduct(p));

    if (filter) {
      const q = filter.toLowerCase();
      arr = arr.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      );
    }

    arr = [...arr].sort((a, b) => {
      switch (sortKey) {
        case "priceA":
          return getDisplayPrice(a) - getDisplayPrice(b);
        case "stock":
          return (a.stock ?? 0) - (b.stock ?? 0);
        case "createdAt":
          return (b.createdAt ?? 0) - (a.createdAt ?? 0);
        case "name":
        default:
          return (a.name ?? "").localeCompare(b.name ?? "", "ko");
      }
    });
    return arr;
  }, [products, category, showOnly, filter, sortKey]);

  const onCount = useMemo(
    () => products.filter((p) => isShoppableProduct(p)).length,
    [products],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight">상품 노출 현황</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          노출 결정은 ERP 의 <strong>&apos;ON&apos; 태그</strong> 로 합니다.
          토글은 <strong>cuboerp 의 상품관리</strong> 에서 진행해주세요.
          (cubo-shop 은 ERP 데이터에 쓰기 권한이 없습니다)
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="rounded-md border bg-background px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">노출 중</span>{" "}
          <strong className="text-brand-pink">{onCount}</strong>
          <span className="text-muted-foreground"> / {products.length}</span>
        </div>
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
            setShowOnly(e.target.value as "all" | "on" | "off")
          }
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="all">노출 — 전체</option>
          <option value="on">노출 중만 (ON)</option>
          <option value="off">비노출만</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="name">정렬: 이름</option>
          <option value="priceA">정렬: 단가</option>
          <option value="stock">정렬: 재고</option>
          <option value="createdAt">정렬: 등록일</option>
        </select>
        <Input
          type="search"
          placeholder="상품명/ID/바코드 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="ml-auto max-w-xs"
        />
      </div>

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
                    <th className="py-3 pl-4 pr-2">상품명</th>
                    <th className="py-3 pr-2">카테고리</th>
                    <th className="py-3 pr-2">단가</th>
                    <th className="py-3 pr-2">재고</th>
                    <th className="py-3 pr-2">태그</th>
                    <th className="py-3 pr-4">노출</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p) => {
                    const shoppable = isShoppableProduct(p);
                    const hasOn = p.tags?.includes("ON") === true;
                    const erpHidden = p.hidden === true;
                    return (
                      <tr key={p.id}>
                        <td className="py-3 pl-4 pr-2">
                          <div className="font-medium">{p.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {p.spec}
                          </div>
                        </td>
                        <td className="py-3 pr-2 text-xs text-muted-foreground">
                          {p.category ?? "—"}
                        </td>
                        <td className="py-3 pr-2">
                          {formatPriceKRW(getDisplayPrice(p))}
                        </td>
                        <td
                          className={cn(
                            "py-3 pr-2",
                            (p.stock ?? 0) <= 0 ? "text-destructive" : "",
                          )}
                        >
                          {p.stock ?? 0}
                        </td>
                        <td className="py-3 pr-2">
                          <div className="flex flex-wrap gap-1">
                            {p.tags?.map((tag) => (
                              <span
                                key={tag}
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-xs",
                                  tag === "ON"
                                    ? "bg-brand-pink/15 font-semibold text-brand-pink"
                                    : "bg-muted",
                                )}
                              >
                                {tag}
                              </span>
                            ))}
                            {erpHidden && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                hidden
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {shoppable ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-brand-mint/30 px-2 py-1 text-xs font-medium">
                              <Check className="size-3" /> 노출 중
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                              <X className="size-3" />{" "}
                              {!hasOn ? "ON 없음" : "비공개"}
                            </span>
                          )}
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
