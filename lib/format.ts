/**
 * 천단위 콤마 + "원" 접미사로 포맷.
 * 예: 12000 → "12,000원"
 */
export function formatPriceKRW(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
