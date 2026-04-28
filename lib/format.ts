/**
 * 천단위 콤마 + "원" 접미사로 포맷.
 * 예: 12000 → "12,000원"
 */
export function formatPriceKRW(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

/**
 * 사업자등록번호를 000-00-00000 형식으로 포맷. 숫자 10자리 기준.
 */
export function formatBusinessRegNo(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * 한국 휴대폰번호를 010-1234-5678 형식으로 포맷.
 * 입력은 숫자만 또는 하이픈 섞여있어도 되며 11자리(010) / 10자리(010 외) 모두 지원.
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // 11자리 또는 12자리 (자르기)
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
