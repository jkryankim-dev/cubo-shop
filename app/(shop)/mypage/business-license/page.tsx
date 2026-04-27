"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { uploadBusinessLicense } from "@/lib/auth";

export default function BusinessLicensePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await uploadBusinessLicense(user.uid, file);
      await refreshProfile();
      setSuccess(true);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setSubmitting(false);
    }
  }

  const current = profile?.businessLicense;

  return (
    <Card>
      <CardHeader>
        <CardTitle>사업자등록증</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {current ? (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
            <div className="font-medium">현재 등록된 사업자등록증</div>
            <p className="mt-1 text-muted-foreground">
              검토 상태:{" "}
              <span className="font-medium text-foreground">
                {statusLabel(current.status)}
              </span>
            </p>
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-brand-pink hover:underline"
            >
              파일 보기
            </a>
            {current.status === "rejected" && current.rejectionReason && (
              <p className="mt-2 text-destructive">
                반려 사유: {current.rejectionReason}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 사업자등록증을 업로드하지 않았습니다. 사업자 회원으로 승급하려면
            업로드해주세요.
          </p>
        )}

        <form onSubmit={handleUpload} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="license">
              {current ? "재업로드 (덮어쓰기)" : "사업자등록증 파일"}
            </Label>
            <Input
              id="license"
              type="file"
              accept=".pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG · 최대 10MB · 검토 후 사업자 등급으로 승급됩니다.
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-brand-pink">
              업로드 완료! 검토는 영업일 기준 1~2일 소요됩니다.
            </p>
          )}
          <Button type="submit" disabled={!file || submitting}>
            {submitting ? "업로드 중…" : "업로드"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function statusLabel(status: "pending" | "approved" | "rejected") {
  if (status === "approved") return "승인 완료";
  if (status === "rejected") return "반려";
  return "검토 중";
}
