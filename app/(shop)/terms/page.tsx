import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
};

export default function TermsPage() {
  return (
    <article className="prose prose-sm mx-auto max-w-3xl px-4 py-10 sm:px-6 dark:prose-invert">
      <h1 className="text-3xl font-bold tracking-tight">이용약관</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        (초안 — 정식 약관은 법률 검토 후 게시 예정)
      </p>

      <section className="mt-8 space-y-8 text-sm leading-7">
        <div>
          <h2 className="text-lg font-semibold">제 1 조 (목적)</h2>
          <p>
            본 약관은 CUBO Shop (이하 &ldquo;회사&rdquo;) 이 운영하는 온라인
            쇼핑몰 (이하 &ldquo;쇼핑몰&rdquo;) 의 이용 조건과 절차, 회사와
            회원 간의 권리·의무·책임 사항을 규정함을 목적으로 합니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">제 2 조 (용어의 정의)</h2>
          <ol className="ml-5 list-decimal space-y-1">
            <li>
              &ldquo;회원&rdquo; 이란 본 약관에 동의하고 회원가입 절차를 마친
              자를 말합니다.
            </li>
            <li>
              &ldquo;사업자 회원&rdquo; 이란 사업자등록증을 제출하여 회사의
              검토 후 승인된 회원으로, 도매가가 적용되는 회원을 말합니다.
            </li>
            <li>
              &ldquo;상품&rdquo; 이란 쇼핑몰이 회원에게 판매하는 모든 재화를
              말합니다.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold">제 3 조 (회원가입)</h2>
          <ol className="ml-5 list-decimal space-y-1">
            <li>
              회원가입은 본 약관 및 개인정보처리방침에 동의하고 회사가 정한
              절차에 따라 가입 양식을 작성한 후, 회사의 승낙으로 성립합니다.
            </li>
            <li>
              회사는 다음 각 호에 해당하는 신청에 대해 가입을 거부하거나
              사후에 회원 자격을 상실시킬 수 있습니다.
              <ul className="ml-5 mt-1 list-disc">
                <li>타인의 정보를 도용한 경우</li>
                <li>허위 정보를 기재한 경우</li>
                <li>이전에 회원 자격을 상실한 적이 있는 경우</li>
              </ul>
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold">제 4 조 (사업자 회원)</h2>
          <ol className="ml-5 list-decimal space-y-1">
            <li>
              사업자 회원은 사업자등록증 사본을 마이페이지에서 업로드하고
              회사의 검토를 받아야 합니다.
            </li>
            <li>
              승인된 사업자 회원에게는 도매가가 적용되며, 일반 회원은 일반
              가격으로 구매합니다.
            </li>
            <li>
              사업자 회원이 사업자 자격을 상실한 경우 즉시 회사에 통지해야
              하며, 회사는 회원 등급을 일반으로 변경할 수 있습니다.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold">제 5 조 (주문·결제)</h2>
          <ol className="ml-5 list-decimal space-y-1">
            <li>주문은 회원이 쇼핑몰에서 상품을 선택하고 결제함으로써 성립합니다.</li>
            <li>
              결제는 회사가 지정한 결제대행 서비스 (PG) 를 통해 이루어지며,
              관련 약관 및 정책은 PG 사의 약관을 따릅니다.
            </li>
            <li>
              회사는 재고 부족, 시스템 오류 등 불가피한 사유로 주문을 취소할 수
              있으며, 이 경우 회원에게 즉시 통지하고 결제 금액을 환불합니다.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold">제 6 조 (배송)</h2>
          <ol className="ml-5 list-decimal space-y-1">
            <li>
              배송은 일반 택배 (로젠택배 등) 를 통해 이루어지며, 평일 오후 2시
              이전 결제 완료 건은 당일 출고를 원칙으로 합니다.
            </li>
            <li>
              송장번호는 출고 시점에 회원의 마이페이지·알림톡으로 안내됩니다.
            </li>
            <li>
              도서·산간 지역, 천재지변, 명절 연휴 등에는 배송이 지연될 수 있습니다.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold">제 7 조 (청약 철회·환불)</h2>
          <ol className="ml-5 list-decimal space-y-1">
            <li>
              회원은 상품 수령 후 7일 이내에 청약을 철회할 수 있습니다
              (전자상거래법 제 17 조).
            </li>
            <li>
              다음 각 호의 경우 청약 철회가 제한될 수 있습니다.
              <ul className="ml-5 mt-1 list-disc">
                <li>회원의 사용·일부 소비로 가치가 현저히 감소한 경우</li>
                <li>시간이 지나 재판매가 곤란한 경우</li>
                <li>주문 제작 상품 등 회원의 요청으로 개별 생산된 경우</li>
              </ul>
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold">제 8 조 (회사의 의무)</h2>
          <p>
            회사는 회원의 개인정보를 안전하게 보호하고, 시스템·데이터를
            지속적으로 관리·점검하며, 회원이 안정적으로 서비스를 이용할 수
            있도록 노력합니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">제 9 조 (회원의 의무)</h2>
          <ol className="ml-5 list-decimal space-y-1">
            <li>회원은 가입 시 정확한 정보를 제공해야 합니다.</li>
            <li>
              회원의 ID 와 비밀번호 관리 책임은 회원 본인에게 있으며, 무단
              사용으로 인한 손해는 회원이 부담합니다.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold">제 10 조 (분쟁 해결)</h2>
          <p>
            회사와 회원 간 분쟁은 상호 협의로 해결하며, 협의되지 않을 경우
            관련 법령 및 상관례에 따릅니다. 본 약관과 관련된 소송의 관할
            법원은 회사 본사 소재지의 법원으로 합니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">부칙</h2>
          <p>본 약관은 2026년 4월 27일부터 시행됩니다.</p>
        </div>
      </section>
    </article>
  );
}
