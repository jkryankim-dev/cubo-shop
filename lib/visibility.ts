// =====================================================================
// 상품 노출 정책 — 단일 진입점
//
// 쿠보몰의 모든 노출 결정은 isShoppableProduct() 만 호출하세요.
// (상품 목록 / 검색 / 상세 진입 / 추천 등)
// =====================================================================

import type { Product } from "@/types";

export interface ShoppableOptions {
  /** true 면 재고 0 인 상품도 비노출 처리 */
  requireStock?: boolean;
}

/**
 * 쿠보몰 노출 가능 여부 판단.
 *
 * 노출 조건 (모두 만족):
 *   - isDeleted 가 true 가 아님
 *   - hidden 이 true 가 아님
 *   - tags 에 'ON' 포함
 *   - (옵션) requireStock=true 인 경우 stock > 0
 */
export function isShoppableProduct(
  p: Product,
  opts: ShoppableOptions = {},
): boolean {
  if (p.isDeleted === true) return false;
  if (p.hidden === true) return false;
  if (!p.tags?.includes("ON")) return false;
  if (opts.requireStock && (p.stock ?? 0) <= 0) return false;
  return true;
}

/**
 * 일반 고객 노출가 산출.
 * priceA 가 있으면 priceA, 없으면 defaultPrice 를 사용합니다.
 */
export function getDisplayPrice(p: Product): number {
  return p.priceA ?? p.defaultPrice ?? 0;
}
