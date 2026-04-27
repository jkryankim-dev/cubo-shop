export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 prose prose-sm sm:px-6 dark:prose-invert">
      <h1 className="text-3xl font-bold tracking-tight">이용약관</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        (초안 — 정식 약관은 법률 검토 후 게시 예정)
      </p>

      <section className="mt-8 space-y-6 text-sm leading-7">
        <div>
          <h2 className="text-lg font-semibold">제 1 조 (목적)</h2>
          <p>
            본 약관은 CUBO Shop (이하 &ldquo;회사&rdquo;) 이 운영하는 온라인
            쇼핑몰의 이용 조건과 절차, 회사와 회원 간 권리·의무 및 책임 사항을
            규정함을 목적으로 합니다.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">제 2 조 (회원가입)</h2>
          <p>
            회원가입은 본 약관 및 개인정보처리방침에 동의하고 회사가 정한 절차에
            따라 신청 양식을 작성한 후, 회사의 승낙으로 성립합니다.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">제 3 조 (사업자 회원)</h2>
          <p>
            매장 운영자(인형뽑기 매장 등) 는 사업자등록증을 제출하여 사업자
            회원으로 승급할 수 있으며, 도매가가 적용됩니다.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">제 4 조 (서비스 이용)</h2>
          <p>
            본 약관 초안은 골격이며, 정식 약관은 법률 검토 후 본 페이지에
            게시됩니다.
          </p>
        </div>
      </section>
    </article>
  );
}
