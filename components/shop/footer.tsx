import Link from "next/link";

import { CuboLogo } from "@/components/shop/logo";

// 사업자 정보 — 실제 값은 .env 또는 별도 설정으로 분리 예정.
// 지금은 하드코딩 placeholder. 운영 전 반드시 실제 값으로 채워야 함.
const BUSINESS_INFO = {
  name: "(주) 큐보",
  ceo: "대표자명",
  registrationNumber: "000-00-00000",
  mailOrderNumber: "제0000-서울XX-0000호",
  address: "서울특별시 ○○구 ○○로 00",
  phone: "02-0000-0000",
  email: "shop@cubo.example",
} as const;

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <CuboLogo className="h-7 w-14" />
            <p className="mt-3 text-sm text-muted-foreground">
              피규어ㆍ가방ㆍ봉제인형 등 온라인 도매몰.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">고객 지원</p>
            <ul className="space-y-1">
              <li>
                <Link href="/terms" className="hover:text-brand-pink">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand-pink">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${BUSINESS_INFO.email}`}
                  className="hover:text-brand-pink"
                >
                  문의하기
                </a>
              </li>
            </ul>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">사업자 정보</p>
            <dl className="space-y-1 [&>div]:flex [&>div]:gap-2">
              <div>
                <dt className="shrink-0">상호</dt>
                <dd>{BUSINESS_INFO.name}</dd>
              </div>
              <div>
                <dt className="shrink-0">대표자</dt>
                <dd>{BUSINESS_INFO.ceo}</dd>
              </div>
              <div>
                <dt className="shrink-0">사업자등록번호</dt>
                <dd>{BUSINESS_INFO.registrationNumber}</dd>
              </div>
              <div>
                <dt className="shrink-0">통신판매업번호</dt>
                <dd>{BUSINESS_INFO.mailOrderNumber}</dd>
              </div>
              <div>
                <dt className="shrink-0">주소</dt>
                <dd>{BUSINESS_INFO.address}</dd>
              </div>
              <div>
                <dt className="shrink-0">전화</dt>
                <dd>{BUSINESS_INFO.phone}</dd>
              </div>
              <div>
                <dt className="shrink-0">이메일</dt>
                <dd>{BUSINESS_INFO.email}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} CUBO Shop. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
