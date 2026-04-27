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
  /** 대표 이미지 URL */
  image?: string;
  /** 갤러리 이미지 (썸네일·옵션 컷용) */
  images?: string[];
  /** 상품 상세 페이지에 세로로 펼쳐 보여줄 긴 이미지들 (ERP 가 업로드) */
  detailImages?: string[];
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
// ShopCustomer — 쇼핑몰 회원 (Firebase Auth uid 기준)
// 컬렉션: shop_customers/{uid}
//
// 가입 흐름: 한국형 ID/PW 가입 → Firebase Auth 는 가짜 이메일
//   (`${loginId}@cubo.shop.local`) 로 등록, 실제 정보는 여기 저장.
// ---------------------------------------------------------------------
export type CustomerGrade =
  | "general" // 일반 회원
  | "business"; // 사업자 회원 (사업자등록증 검증 완료)

export interface ShopCustomer {
  uid: string;
  /** 로그인용 ID (영문/숫자, 4-12자) */
  loginId: string;
  /** 가짜 이메일 (Firebase Auth 식별자, `${loginId}@cubo.shop.local`) */
  authEmail: string;
  /** 사용자가 입력한 실제 이메일 */
  email: string;
  /** 성함 */
  name: string;
  /** 휴대폰번호 (본인인증 SDK 추후) */
  phone: string;
  /** 본인인증 완료 여부 */
  phoneVerified?: boolean;
  /** 기본 주소 */
  defaultAddress?: ShippingAddress;
  /** 사업자등록증 (가입 후 업로드 가능) */
  businessLicense?: BusinessLicense;
  /** 회원 등급 */
  grade: CustomerGrade;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BusinessLicense {
  /** Firebase Storage 다운로드 URL */
  url: string;
  /** Storage 경로 (path) — 삭제·재업로드용 */
  storagePath: string;
  /** 검증 상태 */
  status: "pending" | "approved" | "rejected";
  uploadedAt?: Timestamp;
  reviewedAt?: Timestamp;
  reviewerUid?: string;
  rejectionReason?: string;
}

// ---------------------------------------------------------------------
// ShippingAddress — 한국형 주소 (다음 우편번호 SDK 와 호환)
// ---------------------------------------------------------------------
export interface ShippingAddress {
  recipient: string;
  phone: string;
  postcode: string;
  /** 도로명 또는 지번 주소 */
  address1: string;
  /** 상세 주소 */
  address2?: string;
  memo?: string;
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
  image?: string;
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
// ShopCart — 장바구니 (localStorage 우선, 로그인 시 동기화)
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

// ---------------------------------------------------------------------
// ShopAdmin — 쇼핑몰 관리자
// 컬렉션: shop_admins/{uid}
//
// 사용자 본인 uid 를 한 번 콘솔에서 등록하면 끝. 추가 admin 도 같은 방식.
// ---------------------------------------------------------------------
export interface ShopAdmin {
  uid: string;
  email?: string;
  displayName?: string;
  /** 권한 (추후 세분화 가능) */
  role: "owner" | "admin";
  createdAt?: Timestamp;
}

// ---------------------------------------------------------------------
// ShopListing — 관리자가 큐레이션한 상품 노출 정보
// 컬렉션: shop_listings/{productId}
//
// productId 는 ERP `products` 의 docId 와 동일.
// published === true 인 항목만 쇼핑몰에 표시.
// ---------------------------------------------------------------------
export interface ShopListing {
  productId: string;
  published: boolean;
  /** 정렬 순서 (작은 값이 먼저) */
  order?: number;
  /** 메인 추천 노출 */
  featured?: boolean;
  /** 노출 시작 시각 */
  listedAt?: Timestamp;
  /** 노출 등록한 관리자 uid */
  listedBy?: string;
  /** 비공개 처리 사유 (관리자 메모) */
  unpublishReason?: string;
}
