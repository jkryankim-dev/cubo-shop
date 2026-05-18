"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth/auth-provider";
import {
  FEATURED_COLLECTION_ID,
  createCollection,
  suggestSlug,
} from "@/lib/collections";

export default function NewCollectionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(999);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!idTouched) {
      const slug = suggestSlug(value);
      if (slug) setId(slug);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!id.trim() || !name.trim()) {
      toast.error("이름과 ID 는 필수입니다.");
      return;
    }
    if (id.trim() === FEATURED_COLLECTION_ID) {
      toast.error(
        `'${FEATURED_COLLECTION_ID}' 는 홈 추천 컬렉션 전용 예약 ID 입니다. 다른 ID 를 사용해주세요.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await createCollection({
        id: id.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        order,
        isPublic,
        createdBy: user.uid,
      });
      toast.success(`컬렉션 "${name}" 이 생성되었습니다.`);
      router.push(`/admin/listings/${id.trim()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/admin/listings"
        className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> 컬렉션 목록
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">새 컬렉션</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
          <CardDescription>
            상품은 다음 단계에서 선택할 수 있어요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>표시명</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="예: 이벤트, 봉제인형, 가방류"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                URL ID (슬러그){" "}
                <span className="text-xs text-muted-foreground">
                  /collections/{id || "..."}
                </span>
              </Label>
              <Input
                value={id}
                onChange={(e) => {
                  setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setIdTouched(true);
                }}
                placeholder="예: event, plush, bags"
                required
              />
              <p className="text-xs text-muted-foreground">
                영문 소문자, 숫자, 하이픈만 가능. 한 번 만들면 변경하기 어려우니
                신중히 정하세요.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>설명 (선택)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="컬렉션 페이지 상단에 표시될 설명"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>정렬 순서</Label>
                <Input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  헤더 메뉴에서 작은 값이 먼저 표시됩니다.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>공개 여부</Label>
                <select
                  value={isPublic ? "public" : "draft"}
                  onChange={(e) => setIsPublic(e.target.value === "public")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="public">공개 (외부 노출)</option>
                  <option value="draft">비공개 (임시 저장)</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "생성 중…" : "다음 — 상품 선택"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
