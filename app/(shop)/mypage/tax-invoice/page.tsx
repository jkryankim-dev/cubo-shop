"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { updateTaxInvoiceInfo } from "@/lib/auth";
import {
  EMPTY_TAX_INVOICE,
  fromTaxInvoiceInfo,
  isTaxInvoiceFilled,
  TaxInvoiceForm,
  toTaxInvoiceInfo,
  type TaxInvoiceFormValue,
} from "@/components/shop/tax-invoice-form";

export default function MypageTaxInvoicePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [value, setValue] = useState<TaxInvoiceFormValue>(EMPTY_TAX_INVOICE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setValue(fromTaxInvoiceInfo(profile.taxInvoiceInfo));
  }, [profile]);

  async function handleSave() {
    if (!user) return;
    if (!isTaxInvoiceFilled(value)) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await updateTaxInvoiceInfo(user.uid, toTaxInvoiceInfo(value));
      await refreshProfile();
      toast.success("세금계산서 정보가 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">프로필을 불러오는 중…</p>
    );
  }

  const hasExisting = Boolean(profile.taxInvoiceInfo);

  return (
    <Card>
      <CardHeader>
        <CardTitle>세금계산서 정보</CardTitle>
        <CardDescription>
          세금계산서 발행 시 사용됩니다. 회원정보와 동일한 항목은 체크박스로
          빠르게 채울 수 있어요.
          {!hasExisting && " — 아직 등록된 정보가 없습니다."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <TaxInvoiceForm
          value={value}
          onChange={setValue}
          sync={{
            name: profile.name,
            email: profile.email,
            defaultAddress: profile.defaultAddress,
          }}
        />
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중…" : hasExisting ? "수정 저장" : "등록"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
