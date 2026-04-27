export default function PrivacyPage() {
  return (
    <article className="prose prose-sm mx-auto max-w-3xl px-4 py-10 sm:px-6 dark:prose-invert">
      <h1 className="text-3xl font-bold tracking-tight">
        개인정보처리방침
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        (초안 — 정식 방침은 법률 검토 후 게시 예정)
      </p>

      <section className="mt-8 space-y-8 text-sm leading-7">
        <div>
          <h2 className="text-lg font-semibold">1. 수집하는 개인정보 항목</h2>
          <p className="mb-2">
            CUBO Shop (이하 &ldquo;회사&rdquo;) 은 다음 항목을 수집합니다.
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>회원가입</strong>: 아이디, 비밀번호 (암호화 저장), 성함,
              이메일, 휴대폰번호, 주소
            </li>
            <li>
              <strong>사업자 회원</strong>: 사업자등록증 사본
            </li>
            <li>
              <strong>주문·배송</strong>: 받는 사람의 성함·연락처·주소, 결제
              수단 정보 (PG 사 매개)
            </li>
            <li>
              <strong>자동 수집</strong>: IP 주소, 쿠키, 접속 로그, 기기 정보
              (서비스 운영·보안)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">2. 개인정보의 수집·이용 목적</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>회원 식별, 로그인 및 본인 확인</li>
            <li>주문 처리, 결제, 배송, 환불</li>
            <li>사업자 회원 등급 검증 및 도매가 적용</li>
            <li>고객 문의 응대, 공지·알림 발송</li>
            <li>서비스 개선, 부정 이용 방지, 통계 분석</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">3. 개인정보의 보유·이용 기간</h2>
          <p>
            회사는 회원의 개인정보를 회원 탈퇴 시까지 보관하며, 다음 각 호의
            정보는 관련 법령에 따라 일정 기간 보관 후 파기합니다.
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>
              계약·청약 철회 등에 관한 기록: <strong>5년</strong> (전자상거래법)
            </li>
            <li>
              대금 결제·재화 공급 기록: <strong>5년</strong> (전자상거래법)
            </li>
            <li>
              소비자 불만·분쟁 처리 기록: <strong>3년</strong> (전자상거래법)
            </li>
            <li>
              표시·광고 기록: <strong>6개월</strong> (전자상거래법)
            </li>
            <li>
              로그인 기록: <strong>3개월</strong> (통신비밀보호법)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">4. 개인정보의 처리 위탁</h2>
          <p className="mb-2">
            서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁합니다.
          </p>
          <table className="w-full border-collapse text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="border border-border px-2 py-1 text-left">
                  수탁자
                </th>
                <th className="border border-border px-2 py-1 text-left">
                  위탁 업무
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-2 py-1">
                  Google (Firebase)
                </td>
                <td className="border border-border px-2 py-1">
                  회원 인증·DB·파일 저장
                </td>
              </tr>
              <tr>
                <td className="border border-border px-2 py-1">Netlify</td>
                <td className="border border-border px-2 py-1">사이트 호스팅</td>
              </tr>
              <tr>
                <td className="border border-border px-2 py-1">팝빌</td>
                <td className="border border-border px-2 py-1">
                  알림톡·SMS 발송
                </td>
              </tr>
              <tr>
                <td className="border border-border px-2 py-1">결제대행 (PG)</td>
                <td className="border border-border px-2 py-1">결제 처리</td>
              </tr>
              <tr>
                <td className="border border-border px-2 py-1">택배사</td>
                <td className="border border-border px-2 py-1">배송 처리</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-semibold">5. 이용자 및 법정대리인의 권리</h2>
          <p>
            이용자는 언제든지 자신의 개인정보 열람·정정·삭제·처리정지를 요구할
            수 있으며, 마이페이지에서 직접 또는 고객센터를 통해 처리할 수
            있습니다. 만 14세 미만 아동의 개인정보 수집·이용에는 법정대리인의
            동의가 필요합니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">6. 개인정보의 안전성 확보 조치</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>비밀번호 단방향 암호화 저장</li>
            <li>서비스 통신 구간 SSL/TLS 암호화</li>
            <li>접근 권한 관리 및 침입 차단·탐지 시스템 운영</li>
            <li>주기적 보안 점검 및 임직원 교육</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">7. 쿠키의 사용</h2>
          <p>
            회사는 로그인 유지, 장바구니 등의 편의 제공을 위해 쿠키 (또는
            localStorage 등) 를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키
            저장을 거부할 수 있으나, 이 경우 일부 서비스 이용에 제한이 있을 수
            있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">8. 개인정보 보호책임자</h2>
          <p>
            회사는 개인정보 처리에 관한 업무를 총괄하는 개인정보 보호책임자를
            지정하고 있으며, 자세한 연락처는 푸터 또는 사업자 정보 페이지에
            안내합니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">9. 정책 변경</h2>
          <p>
            본 방침이 추가·삭제·수정될 경우 변경사항의 시행 7일 전부터 본
            페이지를 통해 공지합니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">부칙</h2>
          <p>본 방침은 2026년 4월 27일부터 시행됩니다.</p>
        </div>
      </section>
    </article>
  );
}
