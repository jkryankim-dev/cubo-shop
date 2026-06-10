// =====================================================================
// 영업링크 (?ref=<code>) 클라이언트 헬퍼
//
// 흐름:
//   1) URL ?ref=<code> 진입 → cookie + localStorage 에 코드 저장 (24시간)
//   2) Server Action recordSalesLinkVisit 호출로 visits++ (세션 1회)
//   3) 회원가입 완료 시 recordSalesLinkSignup 호출로 signups++ + customer.salesRef 셋
//   4) 그 사이 모든 페이지에서 hasSalesRefCookie() 로 가격 노출 게이트 통과
//
// 쿠키 보안: HttpOnly 아님 (JS 가 읽어야 함). 단순 추적용이라 민감 정보 아님.
// =====================================================================

const COOKIE_NAME = "cubo_sales_ref";
const VISIT_FLAG_NAME = "cubo_sales_ref_visited";
const MAX_AGE_DAYS = 30;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** 현재 활성 ?ref 코드 (cookie 우선, 없으면 localStorage). */
export function getSalesRef(): string | null {
  if (!isBrowser()) return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`),
  );
  if (m) return decodeURIComponent(m[1]);
  try {
    return localStorage.getItem(COOKIE_NAME);
  } catch {
    return null;
  }
}

/** ref 보유 여부 (가격 노출 게이트에서 사용). */
export function hasSalesRefCookie(): boolean {
  return !!getSalesRef();
}

/** 영업링크 코드 저장 (진입 시 한 번). */
export function setSalesRef(code: string): void {
  if (!isBrowser()) return;
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  // SameSite=Lax 로 외부 링크 진입 시에도 살아남게 함
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  try {
    localStorage.setItem(COOKIE_NAME, code);
  } catch {
    // localStorage 막혀있어도 cookie 만으로 동작
  }
}

/** 가입 완료 후 (또는 명시적 해제 시) 영업링크 코드 제거. */
export function clearSalesRef(): void {
  if (!isBrowser()) return;
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
  try {
    localStorage.removeItem(COOKIE_NAME);
  } catch {
    // ignore
  }
}

/** 한 세션 안에서 같은 ref 의 방문 카운트가 중복 증가하지 않도록 표시. */
export function markVisitRecorded(code: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(VISIT_FLAG_NAME, code);
  } catch {
    // ignore
  }
}

export function isVisitRecorded(code: string): boolean {
  if (!isBrowser()) return false;
  try {
    return sessionStorage.getItem(VISIT_FLAG_NAME) === code;
  } catch {
    return false;
  }
}
