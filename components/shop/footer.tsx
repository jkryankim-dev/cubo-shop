import Link from "next/link";

import { CuboLogo } from "@/components/shop/logo";

// 사업자 정보 — .env 의 NEXT_PUBLIC_BUSINESS_* 로 override 가능.
// 발행 주체는 "쿠보유통". 통신판매업번호만 주식회사 쿠보 명의 그대로 유지.
const BUSINESS_INFO = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "쿠보유통",
  ceo: process.env.NEXT_PUBLIC_BUSINESS_CEO || "대표자명 등록 예정",
  registrationNumber:
    process.env.NEXT_PUBLIC_BUSINESS_REG_NO || "사업자등록번호 등록 예정",
  mailOrderNumber:
    process.env.NEXT_PUBLIC_BUSINESS_MAIL_ORDER_NO ||
    "제2025-충남천안-1814호",
  address:
    process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "주소 등록 예정",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "전화번호 등록 예정",
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "이메일 등록 예정",
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
          © {new Date().getFullYear()} {BUSINESS_INFO.name}. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
