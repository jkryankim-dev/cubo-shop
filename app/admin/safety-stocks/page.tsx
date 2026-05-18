"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import {
  getSafetyStockMap,
  upsertSafetyStock,
} from "@/lib/safety-stocks";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface Row {
  product: Product;
  /** Firestore 에 저장된 안전재고 (편집 전) */
  saved: number;
  /** input 박스 현재값 */
  draft: string;
  /** 저장 진행 중 */
  saving: boolean;
}

type Filter = "all" | "below" | "set" | "unset";

export default function AdminSafetyStocksPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [productSnap, safetyMap] = await Promise.all([
          getDocs(collection(db, "products")),
          getSafetyStockMap(),
        ]);
        if (cancelled) return;
        const next: Row[] = productSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => p.isDeleted !== true)
          .map((p) => {
            const saved = safetyMap.get(p.id) ?? 0;
            return {
              product: p,
              saved,
              draft: saved > 0 ? String(saved) : "",
              saving: false,
            };
          })
          .sort((a, b) =>
            (a.product.name ?? "").localeCompare(b.product.name ?? "", "ko"),
          );
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

  const filtered = useMemo(() => {
    let arr = rows;
    switch (filter) {
      case "below":
        // 실재고가 안전재고 이하 (=품절 자동 처리되는 항목)
        arr = arr.filter(
          (r) => r.saved > 0 && (r.product.stock ?? 0) <= r.saved,
        );
        break;
      case "set":
        arr = arr.filter((r) => r.saved > 0);
        break;
      case "unset":
        arr = arr.filter((r) => r.saved === 0);
        break;
      default:
        break;
    }
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (r) =>
          r.product.name?.toLowerCase().includes(q) ||
          r.product.id.toLowerCase().includes(q) ||
          r.product.barcode?.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [rows, filter, query]);

  const belowCount = useMemo(
    () =>
      rows.filter(
        (r) => r.saved > 0 && (r.product.stock ?? 0) <= r.saved,
      ).length,
    [rows],
  );

  function patchRow(productId: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) =>
        r.product.id === productId ? { ...r, ...patch } : r,
      ),
    );
  }

  async function saveRow(productId: string) {
    if (!user) return;
    const row = rows.find((r) => r.product.id === productId);
    if (!row) return;
    const value = Number(row.draft);
    if (Number.isNaN(value) || value < 0) {
      toast.error("0 이상의 숫자를 입력해주세요.");
      return;
    }
    patchRow(productId, { saving: true });
    try {
      await upsertSafetyStock(productId, value, user.uid);
      patchRow(productId, {
        saved: value,
        draft: value > 0 ? String(value) : "",
        saving: false,
      });
      toast.success(
        value > 0
          ? `안전재고 ${value} 저장`
          : "안전재고 미설정으로 변경",
      );
    } catch (err) {
      patchRow(productId, { saving: false });
      toast.error(err instanceof Error ? err.message : "저장 실패");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">안전재고 관리</h1>
        {belowCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
            <AlertTriangle className="size-3" />
            안전재고 미달 {belowCount}건
          </span>
        )}
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        실재고가 안전재고 <strong>이하</strong> 가 되면 자동 품절 처리됩니다 (고객
        화면 + 결제 거부). 0 이나 빈 값 저장 시 해당 상품의 안전재고는
        해제됩니다.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { value: "all", label: "전체" },
            { value: "below", label: `안전재고 미달 (${belowCount})` },
            { value: "set", label: "설정된 것만" },
            { value: "unset", label: "미설정만" },
          ] as { value: Filter; label: string }[]
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === opt.value
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background hover:bg-accent/40",
            )}
          >
            {opt.label}
          </button>
        ))}
        <Input
          type="search"
          placeholder="상품명/ID/바코드 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
                    <th className="py-3 pr-2">실재고</th>
                    <th className="py-3 pr-2">안전재고</th>
                    <th className="py-3 pr-2">상태</th>
                    <th className="py-3 pr-4">저장</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((row) => {
                    const stock = row.product.stock ?? 0;
                    const isBelow = row.saved > 0 && stock <= row.saved;
                    const draftNum = Number(row.draft || "0");
                    const isDirty = draftNum !== row.saved;
                    return (
                      <tr key={row.product.id}>
                        <td className="py-3 pl-4 pr-2">
                          <div className="font-medium">{row.product.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {row.product.id}
                          </div>
                        </td>
                        <td className="py-3 pr-2">
                          <span
                            className={cn(
                              isBelow ? "text-destructive font-semibold" : "",
                            )}
                          >
                            {stock.toLocaleString("ko-KR")}
                          </span>
                        </td>
                        <td className="py-3 pr-2">
                          <Input
                            type="number"
                            value={row.draft}
                            onChange={(e) =>
                              patchRow(row.product.id, { draft: e.target.value })
                            }
                            className="h-8 w-24 text-sm"
                            placeholder="—"
                            min={0}
                          />
                        </td>
                        <td className="py-3 pr-2">
                          {isBelow ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive">
                              <AlertTriangle className="size-3" /> 자동 품절
                            </span>
                          ) : row.saved > 0 ? (
                            <span className="rounded bg-brand-mint/30 px-2 py-0.5 text-xs">
                              여유
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              미설정
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Button
                            size="sm"
                            variant={isDirty ? "default" : "outline"}
                            disabled={!isDirty || row.saving}
                            onClick={() => saveRow(row.product.id)}
                          >
                            {row.saving ? "저장 중…" : "저장"}
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
