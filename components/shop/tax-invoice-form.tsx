"use client";

import { useEffect, useState } from "react";
import DaumPostcode, { type Address } from "react-daum-postcode";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaxInvoiceInfo, ShippingAddress } from "@/types";

export interface TaxInvoiceFormSyncSource {
  name?: string;
  email?: string;
  defaultAddress?: ShippingAddress;
}

export interface TaxInvoiceFormValue {
  ceo: string;
  companyName: string;
  industry: string;
  businessType: string;
  postcode: string;
  address1: string;
  address2: string;
  email: string;
}

export const EMPTY_TAX_INVOICE: TaxInvoiceFormValue = {
  ceo: "",
  companyName: "",
  industry: "",
  businessType: "",
  postcode: "",
  address1: "",
  address2: "",
  email: "",
};

export function fromTaxInvoiceInfo(
  info?: TaxInvoiceInfo,
): TaxInvoiceFormValue {
  if (!info) return EMPTY_TAX_INVOICE;
  return {
    ceo: info.ceo,
    companyName: info.companyName,
    industry: info.industry,
    businessType: info.businessType,
    postcode: info.address.postcode,
    address1: info.address.address1,
    address2: info.address.address2 ?? "",
    email: info.email,
  };
}

export function toTaxInvoiceInfo(v: TaxInvoiceFormValue): TaxInvoiceInfo {
  return {
    ceo: v.ceo.trim(),
    companyName: v.companyName.trim(),
    industry: v.industry.trim(),
    businessType: v.businessType.trim(),
    address: {
      postcode: v.postcode.trim(),
      address1: v.address1.trim(),
      address2: v.address2.trim() || undefined,
    },
    email: v.email.trim(),
  };
}

export function isTaxInvoiceFilled(v: TaxInvoiceFormValue): boolean {
  return Boolean(
    v.ceo.trim() &&
      v.companyName.trim() &&
      v.industry.trim() &&
      v.businessType.trim() &&
      v.postcode.trim() &&
      v.address1.trim() &&
      v.email.trim(),
  );
}

interface TaxInvoiceFormProps {
  value: TaxInvoiceFormValue;
  onChange: (v: TaxInvoiceFormValue) => void;
  /** "회원정보와 동일" 체크박스의 값 소스 */
  sync?: TaxInvoiceFormSyncSource;
}

export function TaxInvoiceForm({
  value,
  onChange,
  sync,
}: TaxInvoiceFormProps) {
  const [sameCeo, setSameCeo] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [sameEmail, setSameEmail] = useState(false);
  const [postcodeOpen, setPostcodeOpen] = useState(false);

  // 체크 상태가 켜졌을 때 회원정보 변경되면 자동 동기화
  useEffect(() => {
    if (sameCeo && sync?.name) {
      onChange({ ...value, ceo: sync.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameCeo, sync?.name]);

  useEffect(() => {
    if (sameAddress && sync?.defaultAddress) {
      onChange({
        ...value,
        postcode: sync.defaultAddress.postcode,
        address1: sync.defaultAddress.address1,
        address2: sync.defaultAddress.address2 ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameAddress, sync?.defaultAddress?.postcode, sync?.defaultAddress?.address1]);

  useEffect(() => {
    if (sameEmail && sync?.email) {
      onChange({ ...value, email: sync.email });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameEmail, sync?.email]);

  function set<K extends keyof TaxInvoiceFormValue>(
    key: K,
    v: TaxInvoiceFormValue[K],
  ) {
    onChange({ ...value, [key]: v });
  }

  function handlePostcodeComplete(data: Address) {
    onChange({
      ...value,
      postcode: data.zonecode,
      address1: data.roadAddress || data.jibunAddress,
    });
    setPostcodeOpen(false);
    if (sameAddress) setSameAddress(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>대표자명</Label>
          {sync?.name && (
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sameCeo}
                onChange={(e) => setSameCeo(e.target.checked)}
              />
              회원정보와 동일
            </label>
          )}
        </div>
        <Input
          value={value.ceo}
          onChange={(e) => {
            set("ceo", e.target.value);
            if (sameCeo) setSameCeo(false);
          }}
          placeholder="홍길동"
        />
      </div>

      <div className="space-y-1.5">
        <Label>상호명</Label>
        <Input
          value={value.companyName}
          onChange={(e) => set("companyName", e.target.value)}
          placeholder="(주) 큐보"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>업종</Label>
          <Input
            value={value.industry}
            onChange={(e) => set("industry", e.target.value)}
            placeholder="도매 및 소매업"
          />
        </div>
        <div className="space-y-1.5">
          <Label>업태</Label>
          <Input
            value={value.businessType}
            onChange={(e) => set("businessType", e.target.value)}
            placeholder="전자상거래 소매업"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>사업장 주소</Label>
          {sync?.defaultAddress && (
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sameAddress}
                onChange={(e) => setSameAddress(e.target.checked)}
              />
              회원정보와 동일
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={value.postcode}
            readOnly
            placeholder="우편번호"
            className="max-w-[140px]"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setPostcodeOpen((v) => !v)}
          >
            {postcodeOpen ? "닫기" : "우편번호 검색"}
          </Button>
        </div>
        {postcodeOpen && (
          <div className="overflow-hidden rounded-md border">
            <DaumPostcode
              onComplete={handlePostcodeComplete}
              style={{ height: 360 }}
            />
          </div>
        )}
        <Input
          value={value.address1}
          readOnly
          placeholder="도로명/지번 주소"
        />
        <Input
          value={value.address2}
          onChange={(e) => set("address2", e.target.value)}
          placeholder="상세주소"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>이메일 (세금계산서 수신)</Label>
          {sync?.email && (
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sameEmail}
                onChange={(e) => setSameEmail(e.target.checked)}
              />
              회원정보와 동일
            </label>
          )}
        </div>
        <Input
          type="email"
          value={value.email}
          onChange={(e) => {
            set("email", e.target.value);
            if (sameEmail) setSameEmail(false);
          }}
          placeholder="tax@cubo.example"
        />
      </div>
    </div>
  );
}
