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
import { updateProductMetaAction } from "@/lib/actions/products";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

/** 기본 표시값 — manufacturer/origin 가 비어있을 때 노출되는 값. */
const DEFAULT_VALUE = "중국";

interface Row {
  product: Product;
  /** 저장된 값 (편집 전) */
  savedManufacturer: string;
  savedOrigin: string;
  /** input 박스 현재값 */
  draftManufacturer: string;
  draftOrigin: string;
  saving: boolean;
}

export default function AdminProductInfoPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const snap = await getDocs(collection(db, "products"));
        if (cancelled) return;
        const next: Row[] = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => p.isDeleted !== true)
          .map((p) => ({
            product: p,
            savedManufacturer: p.manufacturer ?? "",
            savedOrigin: p.origin ?? "",
            draftManufacturer: p.manufacturer ?? "",
            draftOrigin: p.origin ?? "",
            saving: false,
          }))
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
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.product.name?.toLowerCase().includes(q) ||
        r.product.id.toLowerCase().includes(q) ||
        r.product.barcode?.toLowerCase().includes(q),
    );
  }, [rows, query]);

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
    patchRow(productId, { saving: true });
    try {
      const idToken = await user.getIdToken();
      const result = await updateProductMetaAction({
        idToken,
        productId,
        manufacturer: row.draftManufacturer,
        origin: row.draftOrigin,
      });
      if (!result.success) {
        toast.error(result.message);
        patchRow(productId, { saving: false });
        return;
      }
      patchRow(productId, {
        savedManufacturer: row.draftManufacturer.trim(),
        savedOrigin: row.draftOrigin.trim(),
        saving: false,
      });
      toast.success(`${row.product.name} — 제조사/원산지 저장`);
    } catch (err) {
      patchRow(productId, { saving: false });
      toast.error(err instanceof Error ? err.message : "저장 실패");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">상품정보 수정</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        제조사·원산지만 쿠보몰 관리자가 수정할 수 있습니다 (상품명/규격/카테고리/재고는
        ERP 에서만 관리). 빈 값으로 저장하면 기본값 <strong>{DEFAULT_VALUE}</strong> 로
        표시됩니다. ⚠️ 여기 저장한 값은 ERP <code>products</code> 원본 데이터에 즉시
        반영됩니다.
      </p>

      <div className="mb-4 flex justify-end">
        <Input
          type="search"
          placeholder="상품명/ID/바코드 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
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
                    <th className="py-3 pl-4 pr-2">상품</th>
                    <th className="w-32 py-3 pr-2">규격</th>
                    <th className="w-28 py-3 pr-2">카테고리</th>
                    <th className="w-20 py-3 pr-2 text-right">재고</th>
                    <th className="w-40 py-3 pr-2">
                      제조사
                      <span className="ml-1 text-[10px] font-normal text-brand-pink">
                        수정 가능
                      </span>
                    </th>
                    <th className="w-40 py-3 pr-2">
                      원산지
                      <span className="ml-1 text-[10px] font-normal text-brand-pink">
                        수정 가능
                      </span>
                    </th>
                    <th className="w-20 py-3 pr-4">저장</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((row) => {
                    const dirty =
                      row.draftManufacturer.trim() !==
                        row.savedManufacturer ||
                      row.draftOrigin.trim() !== row.savedOrigin;
                    return (
                      <tr key={row.product.id} className="align-top">
                        <td className="py-3 pl-4 pr-2">
                          <div className="font-medium">{row.product.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {row.product.id}
                          </div>
                        </td>
                        <td className="py-3 pr-2 text-muted-foreground">
                          {row.product.spec || "—"}
                        </td>
                        <td className="py-3 pr-2 text-muted-foreground">
                          {row.product.category || "—"}
                        </td>
                        <td className="py-3 pr-2 text-right text-muted-foreground">
                          {(row.product.stock ?? 0).toLocaleString("ko-KR")}
                        </td>
                        <td className="py-3 pr-2">
                          <Input
                            value={row.draftManufacturer}
                            onChange={(e) =>
                              patchRow(row.product.id, {
                                draftManufacturer: e.target.value,
                              })
                            }
                            placeholder={DEFAULT_VALUE}
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <Input
                            value={row.draftOrigin}
                            onChange={(e) =>
                              patchRow(row.product.id, {
                                draftOrigin: e.target.value,
                              })
                            }
                            placeholder={DEFAULT_VALUE}
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <Button
                            size="sm"
                            variant={dirty ? "default" : "outline"}
                            disabled={!dirty || row.saving}
                            onClick={() => saveRow(row.product.id)}
                            className={cn(!dirty && "text-muted-foreground")}
                          >
                            {row.saving ? "저장…" : "저장"}
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
