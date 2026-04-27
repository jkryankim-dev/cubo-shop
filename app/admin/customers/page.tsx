"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { listAllCustomers, reviewBusinessLicense } from "@/lib/admin";
import type { ShopCustomer } from "@/types";

export default function AdminCustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<ShopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAllCustomers()
      .then((list) => {
        if (cancelled) return;
        setCustomers(list);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "로드 실패");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleReview(uid: string, approve: boolean) {
    if (!user) return;
    let reason: string | undefined;
    if (!approve) {
      const r = window.prompt("반려 사유를 입력해주세요.");
      if (!r) return;
      reason = r;
    }
    setSavingUid(uid);
    try {
      await reviewBusinessLicense({
        uid,
        approve,
        reviewerUid: user.uid,
        rejectionReason: reason,
      });
      setCustomers((prev) =>
        prev.map((c) =>
          c.uid === uid
            ? {
                ...c,
                grade: approve ? "business" : c.grade,
                businessLicense: c.businessLicense
                  ? {
                      ...c.businessLicense,
                      status: approve ? "approved" : "rejected",
                      rejectionReason: reason,
                    }
                  : c.businessLicense,
              }
            : c,
        ),
      );
      toast.success(approve ? "사업자 회원으로 승급되었습니다." : "반려 처리됨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "처리 실패");
    } finally {
      setSavingUid(null);
    }
  }

  // 사업자등록증 업로드한 회원 우선
  const sorted = [...customers].sort((a, b) => {
    const aPending = a.businessLicense?.status === "pending" ? 0 : 1;
    const bPending = b.businessLicense?.status === "pending" ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return (a.name ?? "").localeCompare(b.name ?? "", "ko");
  });

  const filtered = filter
    ? sorted.filter(
        (c) =>
          c.name?.includes(filter) ||
          c.loginId?.includes(filter) ||
          c.email?.includes(filter) ||
          c.phone?.includes(filter),
      )
    : sorted;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">사업자 회원 검토</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            사업자등록증을 업로드한 회원을 검토하고 승급/반려할 수 있어요.
          </p>
        </div>
        <Input
          type="search"
          placeholder="이름/아이디/이메일/전화 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">회원 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              일치하는 회원이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">회원</th>
                    <th className="py-2 pr-4">연락처</th>
                    <th className="py-2 pr-4">현재 등급</th>
                    <th className="py-2 pr-4">사업자등록증</th>
                    <th className="py-2 pr-4">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((c) => {
                    const license = c.businessLicense;
                    const isPending = license?.status === "pending";
                    return (
                      <tr key={c.uid}>
                        <td className="py-3 pr-4">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.loginId}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          <div>{c.phone}</div>
                          <div>{c.email}</div>
                        </td>
                        <td className="py-3 pr-4">
                          {c.grade === "business" ? (
                            <span className="rounded bg-brand-mint/40 px-2 py-0.5 text-xs">
                              사업자
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs">
                              일반
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {license ? (
                            <a
                              href={license.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-pink hover:underline"
                            >
                              파일 보기 ({statusLabel(license.status)})
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              미등록
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {license && isPending ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={savingUid === c.uid}
                                onClick={() => handleReview(c.uid, true)}
                              >
                                승인
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingUid === c.uid}
                                onClick={() => handleReview(c.uid, false)}
                              >
                                반려
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
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

function statusLabel(status: "pending" | "approved" | "rejected") {
  if (status === "approved") return "승인 완료";
  if (status === "rejected") return "반려";
  return "검토 중";
}
