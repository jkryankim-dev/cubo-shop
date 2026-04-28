"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { ArrowLeft, Trash2 } from "lucide-react";
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
  deleteCollection,
  getCollection,
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
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(999);
  const [isPublic, setIsPublic] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [showOnly, setShowOnly] = useState<"all" | "selected" | "available">(
    "all",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [c, productSnap] = await Promise.all([
          getCollection(id),
          getDocs(collection(db, "products")),
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
        setFeatured(c.featured ?? false);
        setSelected(new Set(c.productIds));
        const prods = productSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => p.isDeleted !== true);
        setProducts(prods);
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

  const filtered = useMemo(() => {
    let arr = products;
    if (showOnly === "selected") arr = arr.filter((p) => selected.has(p.id));
    else if (showOnly === "available")
      arr = arr.filter((p) => isShoppableProduct(p));

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
  }, [products, selected, filter, showOnly]);

  function toggle(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
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
        productIds: Array.from(selected),
        order,
        isPublic,
        featured,
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

  const selectedShoppable = Array.from(selected).filter((pid) => {
    const p = products.find((x) => x.id === pid);
    return p ? isShoppableProduct(p) : false;
  }).length;

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
          <h1 className="text-2xl font-bold tracking-tight">{coll.name}</h1>
          <p className="mt-1 text-xs font-mono text-muted-foreground">
            /collections/{coll.id}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1 size-4" /> 컬렉션 삭제
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>

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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                메인 추천
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 p-5 text-sm">
              <p className="text-xs text-muted-foreground">선택된 상품</p>
              <p className="text-2xl font-bold">{selected.size}</p>
              <p className="text-xs text-muted-foreground">
                실제 노출 가능 (ON 태그 보유):{" "}
                <strong>{selectedShoppable}</strong>개
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">상품 선택</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={showOnly}
                onChange={(e) =>
                  setShowOnly(
                    e.target.value as "all" | "selected" | "available",
                  )
                }
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="all">전체</option>
                <option value="available">노출 가능 (ON) 만</option>
                <option value="selected">선택된 것만</option>
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
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                일치하는 상품이 없습니다.
              </p>
            ) : (
              <ul className="max-h-[600px] divide-y overflow-y-auto">
                {filtered.map((p) => {
                  const checked = selected.has(p.id);
                  const shoppable = isShoppableProduct(p);
                  return (
                    <li key={p.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors",
                          checked ? "bg-brand-pink/5" : "hover:bg-muted/40",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(p.id)}
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
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">
                            {p.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.category ?? "—"} · {formatPriceKRW(getDisplayPrice(p))}
                          </p>
                        </div>
                        {!shoppable && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            ON 없음
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
