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
 *   - (옵션) requireStock=true 인 경우 effectiveStock > 0
 *     · effectiveStock = stock - safetyStock (안전재고 차감)
 */
export function isShoppableProduct(
  p: Product,
  opts: ShoppableOptions = {},
): boolean {
  if (p.isDeleted === true) return false;
  if (p.hidden === true) return false;
  if (!p.tags?.includes("ON")) return false;
  if (opts.requireStock && effectiveStockOf(p) <= 0) return false;
  return true;
}

/** 실재고 - 안전재고. 안전재고 미설정 시 실재고 그대로. 음수면 0. */
export function effectiveStockOf(p: Product): number {
  return Math.max(0, (p.stock ?? 0) - (p.safetyStock ?? 0));
}

/** 쇼핑몰 표시·결제 기준 품절 여부. 실재고가 안전재고 이하면 품절. */
export function isSoldOut(p: Product): boolean {
  return effectiveStockOf(p) <= 0;
}

/**
 * 일반 고객 노출가 산출.
 *
 * 정책: priceA 우선, 없으면 defaultPrice fallback.
 *
 * 이 함수는 노출가뿐 아니라 결제·주문 시점의 가격 계산에도 사용되어야
 * cubo-shop ↔ ERP 사이 totalAmount 가 일관됩니다.
 * (Server Action 의 createPendingOrderAction 도 동일 함수 호출 — bundleUnit
 *  로 곱한 totalPrice 산출에 사용)
 */
export function getDisplayPrice(p: Product): number {
  return p.priceA ?? p.defaultPrice ?? 0;
}

/**
 * 묶음수량 (bundleUnit) — ERP 가 설정한 묶음 판매 단위.
 * 미설정 또는 1 이면 일반 단가 단위로 구매.
 * 2 이상이면 그 배수로만 구매 가능.
 */
export function getBundleUnit(p: Product): number {
  const bu = p.bundleUnit ?? 1;
  return bu > 0 ? bu : 1;
}
