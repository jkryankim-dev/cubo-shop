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
  /** 상품 상세 페이지 — 단일 이미지 (Firebase Storage URL, ERP 가 등록) */
  detailImageUrl?: string;
  /** 상품 상세 페이지 — 자유 텍스트 (줄바꿈 유지, ERP 가 등록) */
  detailText?: string;
  tags?: ProductTag[];
  noInvoiceSince?: string;
  hidden?: boolean;
  franchiseOnlyUntil?: number | null;
  isDeleted?: boolean;
  /** ERP 표기 — number (ms epoch). Timestamp 가 아님에 주의. */
  createdAt: number;
  /**
   * 제조사 (cubo-shop 의 /admin/product-info 에서 수정 가능).
   * 미입력 시 상품 상세에서 "중국" 으로 노출됨.
   *
   * ⚠️ ERP `products` 컬렉션의 원 데이터에 직접 쓰는 필드입니다.
   * cubo-shop 이 ERP 원본을 수정하는 두 필드 중 하나 (다른 하나 = origin).
   */
  manufacturer?: string;
  /**
   * 원산지 (cubo-shop 의 /admin/product-info 에서 수정 가능).
   * 미입력 시 상품 상세에서 "중국" 으로 노출됨.
   *
   * ⚠️ ERP `products` 컬렉션의 원 데이터에 직접 쓰는 필드입니다.
   */
  origin?: string;
  /**
   * 안전재고 (cubo-shop 측 정책, ERP 와 무관).
   * 코드에서 `shop_safety_stocks` 컬렉션의 값을 join 해서 채우는 임시 필드.
   * Firestore products 에는 저장되지 않음.
   */
  safetyStock?: number;
}

// ---------------------------------------------------------------------
// ShopSafetyStock — 안전재고 (cubo-shop 운영 정책)
// 컬렉션: shop_safety_stocks/{productId}
//
// 노출 정책: 실재고 stock <= safetyStock 이면 자동 품절 처리
//   (재고는 있으되 운영자가 정한 최소 보유선 밑이라 판매 X)
// ---------------------------------------------------------------------
export interface ShopSafetyStock {
  productId: string;
  /** 안전재고 임계값 — 실재고가 이 값 이하면 품절 */
  threshold: number;
  updatedAt?: Timestamp;
  updatedBy?: string;
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
  /** 로그인용 ID (영문/숫자, 4-12자). ERP 비가맹 마이그레이션 회원은 ERP users 문서ID */
  loginId: string;
  /**
   * 가짜 이메일 (Firebase Auth 식별자, `${loginId}@cubo.shop.local`).
   * ERP 비가맹 마이그레이션 회원은 비어있을 수 있음 (커스텀 토큰 흐름).
   */
  authEmail?: string;
  /** 사용자가 입력한 실제 이메일 */
  email: string;
  name: string;
  /** 사업자 회원 상호 (ERP 의 거래처 표시명으로 사용 — taxInvoiceInfo.companyName 과 별도) */
  companyName?: string;
  phone: string;
  phoneVerified?: boolean;
  defaultAddress?: ShippingAddress;
  businessLicense?: BusinessLicense;
  /** 세금계산서 정보 (선택, 회원가입/마이페이지에서 입력) */
  taxInvoiceInfo?: TaxInvoiceInfo;
  grade: CustomerGrade;
  marketingOptIn?: boolean;
  /**
   * 영업링크 (`?ref=<code>`) 로 들어와 가입한 경우 그 코드.
   * ERP `shop_sales_links/{code}` 와 연결되어 영업자/배포자 추적용.
   */
  salesRef?: string;
  /**
   * ERP `entities/{id}` 와 연결된 거래처 ID.
   * ERP 비가맹 회원 마이그레이션 시 반드시 기록 (중복 거래처 생성 방지).
   */
  erpEntityId?: string;
  /** 첫 로그인 동의 정보 (cubo-shop 약관/개인정보/마케팅/카카오톡) */
  consents?: ShopCustomerConsents;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ShopCustomerConsents {
  /** 이용약관 (필수) */
  terms: boolean;
  /** 개인정보 처리방침 (필수) */
  privacy: boolean;
  /** 마케팅/신상품 수신 (선택) */
  marketing: boolean;
  /** 카카오톡 알림톡 수신 (선택) */
  kakao: boolean;
  agreedAt?: Timestamp;
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
// TaxInvoiceInfo — 세금계산서 발행용 정보
//
// 사업자 회원이든 일반 회원이든 입력 가능.
// 회원가입 시 또는 마이페이지에서 추후 입력 가능.
// 한국 전자세금계산서 발행에 사업자등록번호도 보통 필요하지만,
// 우선 사용자 명시 6개 필드만 보관 (필요 시 추가).
// ---------------------------------------------------------------------
export interface TaxInvoiceAddress {
  postcode: string;
  address1: string;
  address2?: string;
}

export interface TaxInvoiceInfo {
  /** 사업자등록번호 (000-00-00000) */
  businessRegNo: string;
  /** 대표자명 */
  ceo: string;
  /** 상호명 */
  companyName: string;
  /** 업종 */
  industry: string;
  /** 업태 */
  businessType: string;
  /** 사업장 주소 */
  address: TaxInvoiceAddress;
  /** 세금계산서 수신용 이메일 */
  email: string;
  updatedAt?: Timestamp;
}
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

export interface ShopOrderVirtualAccount {
  /** 토스 응답의 은행 코드 (예: "20" = 국민) */
  bankCode?: string;
  /** 한국어 은행명 (lib/banks.ts 매핑) */
  bankName?: string;
  /** 발급된 가상계좌 번호 */
  accountNumber: string;
  /** 입금 기한 ISO datetime (토스 응답 그대로) */
  dueDate?: string;
}

export interface ShopOrderItem {
  productId: string;
  /** 상품명 스냅샷 (ERP productName 과 매핑) */
  name: string;
  unitPrice: number;
  quantity: number;
  /** unitPrice * quantity (스냅샷, 부가세 포함가) */
  totalPrice: number;
  image?: string;
}

export interface ShopOrder {
  id: string;
  customerUid: string;
  /** 주문자 이름 (스냅샷, ERP 표시용) */
  customerName: string;
  /** 주문자 사업자 상호 (있으면, ERP 표시명 "쿠보몰 (상호)" 에 사용) */
  customerCompany?: string;
  /** 주문자 등급 (스냅샷) */
  customerGrade?: "general" | "business";
  /** 주문자 휴대폰 (스냅샷) */
  customerPhone: string;
  /** 주문자 이메일 (스냅샷) */
  customerEmail: string;
  items: ShopOrderItem[];
  totalAmount: number;
  status: ShopOrderStatus;
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  carrier?: string;
  /** 결제 수단 (현재 운영: "BANK_TRANSFER" 만. 과거 토스 흐름의 CARD/VIRTUAL_ACCOUNT 호환용으로 string) */
  paymentMethod?: string;
  /** 입금받을 회사 법인계좌 스냅샷 (주문 시점의 settings 값). 무통장입금 안내 표시용. */
  depositAccount?: ShopOrderDepositAccount;
  /** @deprecated 토스 가상계좌 흐름은 폐기됨. 기존 주문 호환용으로만 유지. */
  paymentId?: string;
  /** @deprecated 토스 가상계좌 흐름은 폐기됨. 기존 주문 호환용으로만 유지. */
  virtualAccount?: ShopOrderVirtualAccount;
  /** 입금대기 만료 시각 (createdAt + 6시간). 경과 시 자동 cancelled */
  expiresAt?: Timestamp;
  /** 무통장입금 수동 입금 마킹 시 (관리자 uid) */
  manuallyPaidBy?: string;
  /** 취소 사유 (auto-expired / manual / payment-fail 등) */
  cancelReason?: string;
  /**
   * 주문시각 — ERP 미러링용 (ms epoch number, ERP 의 createdAt 관례와 동일).
   * createdAt(Firestore Timestamp) 과 같은 시각이지만 타입이 다름.
   */
  orderedAt?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** 무통장입금 안내용 회사 법인계좌 스냅샷. 주문 시점의 settings 값을 박아둠. */
export interface ShopOrderDepositAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  /** 입금자명 가이드 (예: 주문자명 또는 회사명) */
  depositorGuide?: string;
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
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ---------------------------------------------------------------------
// SitePaymentSettings — 무통장입금용 회사 법인계좌 설정
// 컬렉션: shop_site_settings/payment
//
// /admin/settings 에서 관리자가 입력. 결제·주문 안내 화면이 이 값을 읽음.
// ---------------------------------------------------------------------
export interface SitePaymentSettings {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  /** 입금 시 안내 문구 (예: "입금자명에 주문자명을 적어주세요") */
  noticeText?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------------------------------------------------------------------
// ShopSalesLink — 영업/배포 추적 링크
// 컬렉션: shop_sales_links/{code}
//
// ERP 에서 발급. cubo-shop 은 ?ref=<code> 진입 시 visits/signups 만 증가.
// 가입 완료 시 shop_customers/{uid}.salesRef 에 code 박음.
// ---------------------------------------------------------------------
export interface ShopSalesLink {
  /** 문서 ID = 링크 코드 */
  salesPerson?: string;
  distributor?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: Timestamp;
  active?: boolean;
  visits?: number;
  signups?: number;
}

// ---------------------------------------------------------------------
// ShopErrorLog — 쿠보몰 전역 오류 수집
// 컬렉션: shop_error_logs/{id}
//
// 수집 진입점:
//   - server: lib/error-logger.ts:logServerError (server actions catch)
//   - client: lib/log-client-error.ts → /api/log-error (window.onerror,
//     unhandledrejection, global-error.tsx)
//
// 관리자 페이지 /admin/error-logs 에서 최근순으로 조회.
// ---------------------------------------------------------------------
export interface ShopErrorLog {
  id: string;
  timestamp?: Timestamp;
  /** 발생 위치 — server action / api route / 브라우저 / Next.js global error */
  source: "server" | "client" | "global";
  level: "error" | "warn";
  /** 오류 메시지 (최대 2000자) */
  message: string;
  /** 스택 트레이스 (최대 5000자) */
  stack?: string;
  /** Next.js 가 production 빌드에서 부여하는 익명 식별자 */
  digest?: string;
  /** client/global 에러 발생 시점 URL */
  url?: string;
  userAgent?: string;
  /** 로그인된 사용자 uid (있으면) */
  userUid?: string;
  /** 발생 컨텍스트 — server action 이름, route 경로 등 */
  context?: string;
  /** 임의 추가 정보 */
  extra?: Record<string, unknown>;
}
