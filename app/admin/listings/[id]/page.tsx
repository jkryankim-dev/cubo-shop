"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { ArrowDown, ArrowLeft, ArrowUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import {
  FEATURED_COLLECTION_ID,
  deleteCollection,
  getCollection,
  isFeaturedCollection,
  listCollections,
  updateCollection,
} from "@/lib/collections";
import { formatPriceKRW } from "@/lib/format";
import { getDisplayPrice, isShoppableProduct } from "@/lib/visibility";
import { cn } from "@/lib/utils";
import type { Product, ShopCollection } from "@/types";

export default function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [coll, setColl] = useState<ShopCollection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  /** 이 컬렉션 외 다른 컬렉션이 이미 점유한 productId 모음 */
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(999);
  const [isPublic, setIsPublic] = useState(true);
  /** 선택된 상품 — 배열 순서 = 노출 순서 */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [showOnly, setShowOnly] = useState<"available" | "all">("available");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [c, productSnap, allCollections] = await Promise.all([
          getCollection(id),
          getDocs(collection(db, "products")),
          listCollections(),
        ]);
        if (cancelled) return;
        if (!c) {
          toast.error("컬렉션을 찾을 수 없습니다.");
          router.replace("/admin/listings");
          return;
        }
        setColl(c);
        setName(c.name);
        setDescription(c.description ?? "");
        setOrder(c.order ?? 999);
        setIsPublic(c.isPublic);
        setSelectedIds(c.productIds);

        const prods = productSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => p.isDeleted !== true);
        setProducts(prods);

        // 다른 컬렉션이 점유한 productId 모음 (한 상품 = 하나의 컬렉션 정책).
        // 단, 추천 컬렉션 (`featured`) 은 큐레이션 슬롯이라 예외:
        //   - 추천 컬렉션 자체를 편집할 땐 어떤 상품이든 추가 가능
        //   - 다른 컬렉션을 편집할 땐 추천 컬렉션의 productIds 는 "taken" 아님
        const taken = new Set<string>();
        if (!isFeaturedCollection(c)) {
          for (const other of allCollections) {
            if (other.id === id) continue;
            if (isFeaturedCollection(other)) continue;
            for (const pid of other.productIds) taken.add(pid);
          }
        }
        setTakenIds(taken);
      } catch (err) {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : "로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  /** 선택된 상품 순서대로 (productMap 매칭 가능한 것만) */
  const selectedProducts = useMemo(() => {
    return selectedIds
      .map((pid) => productMap.get(pid))
      .filter((p): p is Product => Boolean(p));
  }, [selectedIds, productMap]);

  /** 추가 가능한 상품: 다른 컬렉션에 안 속하고, 본 컬렉션에도 아직 안 선택된 것 */
  const addableProducts = useMemo(() => {
    let arr = products.filter(
      (p) => !takenIds.has(p.id) && !selectedIds.includes(p.id),
    );
    if (showOnly === "available") arr = arr.filter((p) => isShoppableProduct(p));
    if (filter) {
      const q = filter.toLowerCase();
      arr = arr.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [products, takenIds, selectedIds, filter, showOnly]);

  function addProduct(productId: string) {
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev : [productId, ...prev],
    );
  }
  function removeProduct(productId: string) {
    setSelectedIds((prev) => prev.filter((pid) => pid !== productId));
  }
  function moveUp(index: number) {
    if (index <= 0) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }
  function moveDown(index: number) {
    setSelectedIds((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }
  /** 1-based 순번을 입력하면 해당 위치로 이동. 사이 항목들은 한 칸씩 밀림. */
  function moveTo(currentIndex: number, newPosition1Based: number) {
    setSelectedIds((prev) => {
      const target =
        Math.max(1, Math.min(prev.length, newPosition1Based)) - 1;
      if (target === currentIndex) return prev;
      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateCollection({
        id,
        name: name.trim(),
        description: description.trim(),
        productIds: selectedIds,
        order,
        isPublic,
      });
      toast.success("저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!coll) return;
    if (
      !window.confirm(
        `"${coll.name}" 컬렉션을 삭제할까요? (포함된 상품 자체는 삭제되지 않습니다)`,
      )
    )
      return;
    try {
      await deleteCollection(id);
      toast.success("컬렉션이 삭제되었습니다.");
      router.push("/admin/listings");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  if (loading || !coll) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  const selectedShoppable = selectedProducts.filter((p) =>
    isShoppableProduct(p),
  ).length;
  const isFeatured = isFeaturedCollection(coll);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/admin/listings"
        className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> 컬렉션 목록
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {coll.name}
            {isFeatured && (
              <span className="rounded-md bg-brand-pink/15 px-2 py-0.5 text-xs font-semibold text-brand-pink">
                홈 추천
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs font-mono text-muted-foreground">
            /collections/{coll.id}
          </p>
        </div>
        <div className="flex gap-2">
          {!isFeatured && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1 size-4" /> 컬렉션 삭제
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>

      {isFeatured && (
        <div className="mb-6 rounded-md border border-brand-pink/30 bg-brand-pink/5 p-4 text-sm">
          <p className="font-semibold text-brand-pink">홈 화면 추천 컬렉션</p>
          <p className="mt-1 text-foreground/80">
            여기에 추가한 상품은 메인 페이지 추천 영역에 노출됩니다. 다른 컬렉션에
            이미 들어있는 상품도 추가할 수 있어요 (한 상품 = 한 컬렉션 규칙의 예외).
            노출 순서는 아래에서 ↑/↓ 버튼으로 조정합니다.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>표시명</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>설명</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>정렬 순서</Label>
                <Input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
              </div>
              <Separator />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                공개 (외부 노출)
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 p-5 text-sm">
              <p className="text-xs text-muted-foreground">선택된 상품</p>
              <p className="text-2xl font-bold">{selectedIds.length}</p>
              <p className="text-xs text-muted-foreground">
                실제 노출 가능 (ON 태그 보유):{" "}
                <strong>{selectedShoppable}</strong>개
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isFeatured
                  ? "이 컬렉션은 홈 화면 큐레이션 슬롯이에요. 다른 컬렉션의 상품도 자유롭게 추가할 수 있습니다."
                  : "한 상품은 하나의 컬렉션에만 속할 수 있어요. 다른 컬렉션에 등록된 상품은 아래 목록에 나타나지 않습니다. (홈 추천 컬렉션은 예외)"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* 선택된 상품 — 순서 조정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                선택된 상품 (노출 순서)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                새로 추가한 상품은 1번으로 들어와요. 순번을 직접 입력하면 그
                자리로 이동하고, 기존 상품은 한 칸씩 밀립니다.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {selectedProducts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  아직 선택된 상품이 없어요. 아래에서 추가해주세요.
                </p>
              ) : (
                <ul className="divide-y">
                  {selectedProducts.map((p, idx) => {
                    const shoppable = isShoppableProduct(p);
                    return (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2"
                      >
                        <Input
                          key={`pos-${p.id}-${idx}`}
                          type="number"
                          defaultValue={idx + 1}
                          min={1}
                          max={selectedProducts.length}
                          aria-label={`${p.name} 순번`}
                          className="h-7 w-14 shrink-0 px-1.5 text-center text-xs"
                          onFocus={(e) => e.currentTarget.select()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            } else if (e.key === "Escape") {
                              e.currentTarget.value = String(idx + 1);
                              e.currentTarget.blur();
                            }
                          }}
                          onBlur={(e) => {
                            const raw = e.currentTarget.value.trim();
                            const parsed = Number(raw);
                            if (
                              !raw ||
                              Number.isNaN(parsed) ||
                              parsed === idx + 1
                            ) {
                              e.currentTarget.value = String(idx + 1);
                              return;
                            }
                            moveTo(idx, parsed);
                          }}
                        />
                        <div className="size-12 shrink-0 overflow-hidden rounded bg-muted">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {p.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.category ?? "—"} ·{" "}
                            {formatPriceKRW(getDisplayPrice(p))}
                          </p>
                        </div>
                        {!shoppable && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            ON 없음
                          </span>
                        )}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={idx === 0}
                            onClick={() => moveUp(idx)}
                            aria-label="위로"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={idx === selectedProducts.length - 1}
                            onClick={() => moveDown(idx)}
                            aria-label="아래로"
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeProduct(p.id)}
                            aria-label="제거"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 추가할 상품 */}
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="text-base">추가할 상품</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={showOnly}
                  onChange={(e) =>
                    setShowOnly(e.target.value as "available" | "all")
                  }
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="available">노출 가능 (ON) 만</option>
                  <option value="all">ON 무관 전체</option>
                </select>
                <Input
                  type="search"
                  placeholder="상품명/ID 검색"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="ml-auto max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {addableProducts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  추가할 수 있는 상품이 없어요. (다른 컬렉션에 이미 등록된 상품은
                  보이지 않습니다)
                </p>
              ) : (
                <ul className="max-h-[500px] divide-y overflow-y-auto">
                  {addableProducts.map((p) => {
                    const shoppable = isShoppableProduct(p);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addProduct(p.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/40",
                          )}
                        >
                          <div className="size-12 shrink-0 overflow-hidden rounded bg-muted">
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {p.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.category ?? "—"} ·{" "}
                              {formatPriceKRW(getDisplayPrice(p))}
                            </p>
                          </div>
                          {!shoppable && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              ON 없음
                            </span>
                          )}
                          <span className="text-xs text-brand-pink">+ 추가</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
