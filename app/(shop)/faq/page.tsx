import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "자주 묻는 질문",
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "회원가입은 무료인가요?",
    a: "네, 무료입니다. 사업자등록증을 등록하시면 사업자 회원으로 승급되어 도매가가 자동 적용됩니다.",
  },
  {
    q: "사업자 회원과 일반 회원의 차이는 무엇인가요?",
    a: "사업자 회원에게는 도매가가 적용됩니다. 마이페이지에서 사업자등록증을 업로드하시면 검토 후 승급됩니다.",
  },
  {
    q: "결제 수단은 무엇이 있나요?",
    a: "무통장입금(법인계좌)만 지원합니다. 주문 접수 후 안내되는 계좌로 입금해주시면, 입금 확인 후 주문이 확정됩니다.",
  },
  {
    q: "주문했는데 아직 입금을 못 했어요.",
    a: "입금이 확인될 때까지 주문은 접수 상태로 유지됩니다. 주문을 취소하시려면 마이페이지 > 주문 내역에서 직접 취소하실 수 있습니다.",
  },
  {
    q: "당일 출고 가능한가요?",
    a: "평일 오후 2시 이전 결제 확정 건은 당일 출고를 원칙으로 합니다. 주말·공휴일·천재지변 등에는 지연될 수 있습니다.",
  },
  {
    q: "배송비는 어떻게 계산되나요?",
    a: "주문 시점에 산출됩니다. 도서·산간 지역은 추가 배송비가 발생할 수 있습니다.",
  },
  {
    q: "교환·환불은 어떻게 하나요?",
    a: "상품 수령 후 7일 이내 가능합니다. 단순 변심의 경우 왕복 배송비는 고객 부담입니다. 자세한 사항은 이용약관을 참고해주세요.",
  },
  {
    q: "세금계산서 발행은 어떻게 신청하나요?",
    a: "마이페이지 > 세금계산서 정보에서 사업자 정보를 등록하시면, 결제 확정 주문에 대해 자동으로 발행됩니다. 사업자등록번호가 필수입니다.",
  },
  {
    q: "비회원으로 결제할 수 있나요?",
    a: "네, 비회원 결제 가능합니다. 단, 주문 내역 관리·도매가 적용·세금계산서 발행 등을 위해 회원가입을 권장합니다.",
  },
  {
    q: "알림톡이 안 와요.",
    a: "휴대폰 번호 정확성과 카카오톡 알림 차단 여부를 확인해주세요. 알림톡 미수신 시 SMS 로 자동 대체 발송됩니다.",
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">자주 묻는 질문</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        궁금한 점이 있다면 먼저 아래에서 확인해보세요. 그 외 문의는{" "}
        <a href="/contact" className="text-brand-pink hover:underline">
          문의하기
        </a>{" "}
        를 이용해주세요.
      </p>

      <div className="mt-8 space-y-3">
        {FAQS.map((faq, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-5">
              <p className="text-sm font-semibold">Q. {faq.q}</p>
              <p className="text-sm leading-6 text-foreground/80">
                A. {faq.a}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
