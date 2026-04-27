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
import type { Product } from "@/types";

/**
 * 쇼핑몰에 노출 가능한 상품 목록을 가져옵니다.
 *
 * 노출 조건:
 *   - `isDeleted !== true`
 *   - `hidden !== true`
 *
 * 환경변수가 비어있으면 빈 배열을 반환합니다 (페이지가 죽지 않게).
 */
export async function getPublicProducts(): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return [];
  }

  const snapshot = await getDocs(collection(db, "products"));
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Product)
    .filter((p) => p.isDeleted !== true && p.hidden !== true)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "ko"));
}
