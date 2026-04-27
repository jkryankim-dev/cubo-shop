"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import {
  addAdminAction,
  listAdminsAction,
  removeAdminAction,
  type AdminListItem,
} from "@/lib/actions/admin-management";

export default function AdminAdminsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLoginId, setNewLoginId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const isOwner = items.some(
    (it) => it.uid === user?.uid && it.role === "owner",
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const result = await listAdminsAction(idToken);
      if (result.success && result.data) {
        setItems(result.data);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newLoginId.trim()) return;
    setAdding(true);
    try {
      const idToken = await user.getIdToken();
      const result = await addAdminAction(idToken, newLoginId.trim());
      if (result.success) {
        toast.success(result.message);
        setNewLoginId("");
        await refresh();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(targetUid: string, label: string) {
    if (!user) return;
    if (!window.confirm(`${label} 의 관리자 권한을 회수할까요?`)) return;
    setRemovingUid(targetUid);
    try {
      const idToken = await user.getIdToken();
      const result = await removeAdminAction(idToken, targetUid);
      if (result.success) {
        toast.success(result.message);
        await refresh();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "회수 실패");
    } finally {
      setRemovingUid(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">관리자 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          마스터(owner) 만 추가·삭제할 수 있어요. 일반 관리자(admin) 는 조회만 가능합니다.
        </p>
      </div>

      {isOwner && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">관리자 추가</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex gap-2">
              <Input
                placeholder="회원 아이디 (loginId)"
                value={newLoginId}
                onChange={(e) => setNewLoginId(e.target.value)}
                disabled={adding}
              />
              <Button type="submit" disabled={adding || !newLoginId.trim()}>
                {adding ? "추가 중…" : "관리자로 등록"}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              해당 아이디로 가입된 회원이 있어야 합니다. 일반 관리자는 상품/주문/회원 검토만 가능합니다 (관리자 추가/삭제 X).
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">관리자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 관리자가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">관리자</th>
                    <th className="py-2 pr-4">권한</th>
                    <th className="py-2 pr-4">등록일</th>
                    <th className="py-2 pr-4 text-right">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => {
                    const isCurrentUser = item.uid === user?.uid;
                    return (
                      <tr key={item.uid}>
                        <td className="py-3 pr-4">
                          <div className="font-medium">
                            {item.name ?? item.loginId ?? "(이름 미상)"}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (나)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.loginId ?? item.email ?? item.uid}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {item.role === "owner" ? (
                            <span className="rounded bg-brand-pink/15 px-2 py-0.5 text-xs font-semibold text-brand-pink">
                              마스터
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs">
                              관리자
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(
                                "ko-KR",
                              )
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {isOwner && item.role !== "owner" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={removingUid === item.uid}
                              onClick={() =>
                                handleRemove(
                                  item.uid,
                                  item.loginId ?? item.uid,
                                )
                              }
                              aria-label="권한 회수"
                            >
                              <Trash2 className="size-4" />
                            </Button>
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
