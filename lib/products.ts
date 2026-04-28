// =====================================================================
// 상품 데이터 액세스 — ERP `products` 컬렉션 READ-ONLY
//
// 노출 결정은 lib/visibility.ts 의 isShoppableProduct() 만 사용합니다.
// (ERP 의 Product.tags 에 'ON' 이 있는 상품만 노출)
// =====================================================================

import { collection, getDocs } from "firebase/firestore";

import { db } from "./firebase";
import { isShoppableProduct } from "./visibility";
import type { Product } from "@/types";

/**
 * 쇼핑몰에 노출 가능한 상품 목록.
 *
 * Firestore where('tags', 'array-contains', 'ON') 로 서버 필터도 가능하지만
 * isDeleted/hidden 추가 필터를 클라이언트에서 한 번 더 처리해야 하므로
 * 일관된 isShoppableProduct() 적용을 위해 클라이언트 필터로 통일합니다.
 * (현 데이터셋 규모에 적합. 운영 규모 확장 시 인덱스 + 서버 필터로 전환)
 *
 * 환경변수가 비어있으면 빈 배열을 반환합니다.
 */
export async function getPublicProducts(): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return [];
  }

  const snap = await getDocs(collection(db, "products"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Product)
    .filter((p) => isShoppableProduct(p))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "ko"));
}
