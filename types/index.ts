// =====================================================================
// 도메인 타입 정의
// =====================================================================

import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------
// Product — ERP `products` 컬렉션 (read-only from this app)
//
// 노출 조건: isDeleted !== true && hidden !== true
// 일반 고객 단가는 priceA. priceB / priceC / priceCOST 는 B2B 단가라 무시.
// ---------------------------------------------------------------------
export interface Product {
  id: string;
  name: string;
  /** 일반 고객 단가 (₩) */
  priceA: number;
  /** B2B 단가 — 쇼핑몰에서는 사용 안 함 */
  priceB?: number;
  priceC?: number;
  priceCOST?: number;
  /** 재고 수량. 결제 확정 시 트랜잭션으로 차감됨 */
  stock: number;
  /** 대표 이미지 URL 또는 URL 배열 */
  image?: string;
  images?: string[];
  category?: string;
  tags?: string[];
  description?: string;

  /** 노출 차단 플래그 — true 이면 쇼핑몰에 표시 안 함 */
  hidden?: boolean;
  /** 삭제 플래그 — true 이면 쇼핑몰에 표시 안 함 */
  isDeleted?: boolean;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ---------------------------------------------------------------------
// ShopCustomer — 쇼핑몰 일반 고객 (Firebase Auth uid 기준)
// 컬렉션: shop_customers/{uid}
// ---------------------------------------------------------------------
export interface ShopCustomer {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  defaultAddress?: ShippingAddress;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ---------------------------------------------------------------------
// ShopOrder — 쇼핑몰 주문 (ERP 의 orders 와 별개)
// 컬렉션: shop_orders/{orderId}
// ---------------------------------------------------------------------
export type ShopOrderStatus =
  | "pending" // 결제 대기
  | "paid" // 결제 완료
  | "preparing" // 배송 준비 중
  | "shipped" // 배송 중
  | "delivered" // 배송 완료
  | "cancelled" // 취소
  | "refunded"; // 환불

export interface ShopOrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ShippingAddress {
  recipient: string;
  phone: string;
  postcode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

export interface ShopOrder {
  id: string;
  customerUid: string;
  items: ShopOrderItem[];
  totalAmount: number;
  status: ShopOrderStatus;
  shippingAddress: ShippingAddress;
  /** 송장번호 (출고 후 입력) */
  trackingNumber?: string;
  /** 택배사 (예: "로젠택배") */
  carrier?: string;
  /** PG 결제 ID (포트원/토스) */
  paymentId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ---------------------------------------------------------------------
// ShopCart — 장바구니 (선택, localStorage 우선)
// 컬렉션: shop_carts/{uid}
// ---------------------------------------------------------------------
export interface ShopCartItem {
  productId: string;
  quantity: number;
}

export interface ShopCart {
  uid: string;
  items: ShopCartItem[];
  updatedAt?: Timestamp;
}
