export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 prose prose-sm sm:px-6 dark:prose-invert">
      <h1 className="text-3xl font-bold tracking-tight">
        개인정보처리방침
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        (초안 — 정식 방침은 법률 검토 후 게시 예정)
      </p>

      <section className="mt-8 space-y-6 text-sm leading-7">
        <div>
          <h2 className="text-lg font-semibold">1. 수집하는 개인정보 항목</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>회원가입: 아이디, 비밀번호(암호화 저장), 성함, 이메일, 휴대폰번호, 주소</li>
            <li>사업자 회원: 사업자등록증 사본</li>
            <li>주문/배송: 받는 분 정보, 배송지, 결제 정보(PG 사 매개)</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>회원 식별 및 서비스 제공</li>
            <li>주문 처리 및 상품 배송</li>
            <li>사업자 회원 등급 검증 및 도매가 적용</li>
            <li>고객 문의 응대</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold">3. 개인정보의 보유 및 이용 기간</h2>
          <p>
            관련 법령에서 정한 보존 기간 (전자상거래법 등) 에 따라 보관하며,
            기간 경과 후 지체 없이 파기합니다.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">4. 개인정보 처리 위탁</h2>
          <p>
            결제 처리 (포트원/토스페이먼츠), 호스팅 (Google Firebase, Netlify),
            배송 (택배사) 등 서비스 제공을 위해 일부 처리를 위탁합니다.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">5. 이용자의 권리</h2>
          <p>
            언제든지 자신의 개인정보 열람·정정·삭제·처리정지를 요구할 수 있으며,
            마이페이지에서 직접 또는 고객센터를 통해 처리할 수 있습니다.
          </p>
        </div>
      </section>
    </article>
  );
}
