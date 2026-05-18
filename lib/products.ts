// =====================================================================
// 상품 데이터 액세스 — ERP `products` 컬렉션 READ-ONLY
//
// 노출 결정은 두 가지 조건을 모두 만족해야 합니다:
//   1) lib/visibility.ts 의 isShoppableProduct() — ERP 의 'ON' 태그 + 안전재고
//   2) shop_collections 중 하나 이상에 등록 — 관리자가 큐레이션 페이지에 추가한 상품만
// =====================================================================

import { collection, getDocs } from "firebase/firestore";

import { db } from "./firebase";
import { listCollections } from "./collections";
import { getSafetyStockMap } from "./safety-stocks";
import { isShoppableProduct } from "./visibility";
import type { Product } from "@/types";

/**
 * 쇼핑몰 카탈로그(`/products`) 에 노출 가능한 상품 목록.
 *
 * 노출 조건 (모두 만족):
 *   - ERP 의 `tags` 에 'ON' 포함, isDeleted/hidden 아님 (isShoppableProduct)
 *   - shop_collections 중 하나 이상에 등록됨
 *
 * 안전재고는 join 해서 product.safetyStock 으로 박아둠 (UI 가 effectiveStock 계산용).
 *
 * 환경변수가 비어있으면 빈 배열을 반환합니다.
 */
export async function getPublicProducts(): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return [];
  }

  const [productSnap, collections, safetyMap] = await Promise.all([
    getDocs(collection(db, "products")),
    listCollections({ publicOnly: true }),
    getSafetyStockMap(),
  ]);

  // 공개 컬렉션에 등록된 productId 모음
  const exposedIds = new Set<string>();
  for (const c of collections) {
    for (const pid of c.productIds) exposedIds.add(pid);
  }

  return productSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Product)
    .map((p) => ({ ...p, safetyStock: safetyMap.get(p.id) ?? 0 }))
    .filter((p) => isShoppableProduct(p))
    .filter((p) => exposedIds.has(p.id))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "ko"));
}
