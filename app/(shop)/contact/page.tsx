import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "문의하기",
};

export default function ContactPage() {
  const phone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || "010-4557-4183";
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "jkryankim@gmail.com";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">문의하기</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        주문·배송·환불 등 모든 문의는 아래로 연락해주세요. 평일 오전 10시~오후
        6시 응대 (주말·공휴일 제외).
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="size-4 text-brand-pink" /> 전화
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{phone}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              평일 10:00 ~ 18:00
            </p>
            <a href={`tel:${phone.replace(/-/g, "")}`} className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                전화 걸기
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4 text-brand-pink" /> 이메일
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold break-all">{email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              영업일 기준 1일 이내 답변
            </p>
            <a href={`mailto:${email}`} className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                이메일 보내기
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 rounded-md border bg-muted/30 p-5 text-sm">
        <p className="font-medium">문의 시 다음 정보를 함께 알려주시면 빠릅니다.</p>
        <ul className="mt-2 ml-4 list-disc space-y-1 text-muted-foreground">
          <li>주문번호 (주문 관련 문의 시)</li>
          <li>주문자 성함·연락처</li>
          <li>문의 유형 (주문·배송·환불·세금계산서 등)</li>
          <li>구체 내용</li>
        </ul>
      </div>
    </div>
  );
}
