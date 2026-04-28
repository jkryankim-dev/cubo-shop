// =====================================================================
// 도메인 타입 정의
// =====================================================================

import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------
// Product — ERP `products` 컬렉션 (read-only from this app)
//
// ERP (cuboerp) 의 Product 타입과 동일 정의를 사용합니다.
// cuboerp 측 변경이 있으면 본 파일도 동기화해주세요.
//
// 노출 결정: lib/visibility.ts 의 isShoppableProduct() 만 사용.
// ---------------------------------------------------------------------

export type ProductTag =
  | "NEW"
  | "HOT"
  | "SALE"
  | "BEST"
  | "FRANCHISE_ONLY"
  | "NO_INVOICE"
  | "ON"; // 온라인 노출 가능

export interface Product {
  id: string;
  name: string;
  /** 규격/사양 (ERP 표기) */
  spec: string;
  barcode?: string;
  category: string;
  costPrice?: number;
  /** 기본가 (priceA 가 없을 때 fallback) */
  defaultPrice: number;
  /** 일반(B2C) 가격 — 쇼핑몰 노출가 */
  priceA?: number;
  priceB?: number;
  priceC?: number;
  stock?: number;
  bundleUnit?: number;
  originalBundleUnit?: number;
  imageUrl?: string;
  /** 상품 상세 페이지 세로 펼침용 이미지 (ERP 가 추후 추가) */
  detailImages?: string[];
  tags?: ProductTag[];
  noInvoiceSince?: string;
  hidden?: boolean;
  franchiseOnlyUntil?: number | null;
  isDeleted?: boolean;
  /** ERP 표기 — number (ms epoch). Timestamp 가 아님에 주의. */
  createdAt: number;
}

// ---------------------------------------------------------------------
// ShopCustomer — 쇼핑몰 회원 (Firebase Auth uid 기준)
// 컬렉션: shop_customers/{uid}
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
  name: string;
  phone: string;
  phoneVerified?: boolean;
  defaultAddress?: ShippingAddress;
  businessLicense?: BusinessLicense;
  grade: CustomerGrade;
  marketingOptIn?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BusinessLicense {
  url: string;
  storagePath: string;
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
  address1: string;
  address2?: string;
  memo?: string;
}

// ---------------------------------------------------------------------
// ShopOrder — 쇼핑몰 주문
// 컬렉션: shop_orders/{orderId}
// ---------------------------------------------------------------------
export type ShopOrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

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
  trackingNumber?: string;
  carrier?: string;
  paymentId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ---------------------------------------------------------------------
// ShopCart — 장바구니 (localStorage 우선)
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
// ---------------------------------------------------------------------
export interface ShopAdmin {
  uid: string;
  email?: string;
  displayName?: string;
  role: "owner" | "admin";
  createdAt?: Timestamp;
}

// ---------------------------------------------------------------------
// ShopCollection — 쇼핑몰 컬렉션 (큐레이션 페이지)
// 컬렉션: shop_collections/{collectionId}
//
// 예: "Event", "봉제인형", "가방류", "디자인류" 같은 카테고리 페이지.
// productIds 에 등록된 상품만 해당 컬렉션 페이지에 노출됩니다.
// 단, 각 상품이 ERP 의 'ON' 태그를 가지고 있어야 실제로 보입니다
// (isShoppableProduct() 가 한 번 더 필터링).
//
// id 는 슬러그 (영문/숫자/하이픈) 로 권장 — URL `/collections/{id}` 에 사용.
// ---------------------------------------------------------------------
export interface ShopCollection {
  id: string;
  /** 표시명 (예: "이벤트", "봉제인형") */
  name: string;
  /** 컬렉션 페이지 상단 설명 */
  description?: string;
  /** 이 컬렉션에 포함된 상품 ID 목록 */
  productIds: string[];
  /** 헤더/사이드바 정렬 순서 (작은 값이 먼저) */
  order: number;
  /** 외부 노출 여부 */
  isPublic: boolean;
  /** 메인에 강조 노출할지 */
  featured?: boolean;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
