"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";

export default function AddressesPage() {
  const { profile } = useAuth();
  const addr = profile?.defaultAddress;

  return (
    <Card>
      <CardHeader>
        <CardTitle>배송지</CardTitle>
      </CardHeader>
      <CardContent>
        {addr ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">기본 배송지</p>
            <p className="text-muted-foreground">{addr.recipient}</p>
            <p className="text-muted-foreground">{addr.phone}</p>
            <p>
              ({addr.postcode}) {addr.address1}
              {addr.address2 ? ` ${addr.address2}` : ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            등록된 배송지가 없습니다.
          </p>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          배송지 추가/수정 UI 는 다음 단계에서 추가됩니다.
        </p>
      </CardContent>
    </Card>
  );
}
