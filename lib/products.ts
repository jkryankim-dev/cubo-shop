// =====================================================================
// 상품 데이터 액세스 — ERP `products` 컬렉션 READ-ONLY
//
// 주의:
//   • 이 모듈은 클라이언트 컴포넌트에서 호출됩니다 (Firestore web SDK 사용).
//   • 쓰기/삭제 함수는 의도적으로 작성하지 않습니다 (DB 공유 원칙).
//   • Firestore where 조건은 `!=` 두 개 동시 사용이 제한적이라
//     클라이언트에서 후처리 필터링합니다 (현재 데이터셋 규모에 적합).
// =====================================================================

import { collection, getDocs } from "firebase/firestore";

import { db } from "./firebase";
import { getAllListings } from "./listings";
import type { Product } from "@/types";

/**
 * 쇼핑몰에 노출 가능한 상품 목록을 가져옵니다.
 *
 * 노출 조건 (모두 만족):
 *   - ERP `products` 의 `isDeleted !== true && hidden !== true`
 *   - 쇼핑몰 `shop_listings/{productId}` 의 `published === true`
 *
 * `shop_listings` 의 `order` 가 작은 순으로, 동률이면 이름 순으로 정렬합니다.
 *
 * 환경변수가 비어있으면 빈 배열을 반환합니다 (페이지가 죽지 않게).
 */
export async function getPublicProducts(): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return [];
  }

  const [productSnap, listings] = await Promise.all([
    getDocs(collection(db, "products")),
    getAllListings(),
  ]);

  return productSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Product)
    .filter((p) => p.isDeleted !== true && p.hidden !== true)
    .filter((p) => listings.get(p.id)?.published === true)
    .sort((a, b) => {
      const oa = listings.get(a.id)?.order ?? Number.MAX_SAFE_INTEGER;
      const ob = listings.get(b.id)?.order ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return (a.name ?? "").localeCompare(b.name ?? "", "ko");
    });
}
