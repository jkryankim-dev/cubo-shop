// =====================================================================
// 안전재고 (Safety Stock) — cubo-shop 측 노출 정책
// 컬렉션: shop_safety_stocks/{productId}
//
// 실재고가 안전재고 이하면 고객 화면에서 자동 품절 표시 + 결제 거부.
// =====================================================================

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import type { ShopSafetyStock } from "@/types";

const COLLECTION = "shop_safety_stocks";

/** 모든 안전재고 → productId → threshold 맵 */
export async function getSafetyStockMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return map;
  const snap = await getDocs(collection(db, COLLECTION));
  snap.forEach((d) => {
    const data = d.data() as ShopSafetyStock;
    if (typeof data.threshold === "number") {
      map.set(d.id, data.threshold);
    }
  });
  return map;
}

/** 단일 상품의 안전재고 — 미설정이면 0 */
export async function getSafetyStockOf(productId: string): Promise<number> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return 0;
  const snap = await getDoc(doc(db, COLLECTION, productId));
  if (!snap.exists()) return 0;
  const data = snap.data() as ShopSafetyStock;
  return typeof data.threshold === "number" ? data.threshold : 0;
}

export async function upsertSafetyStock(
  productId: string,
  threshold: number,
  updatedBy: string,
) {
  if (threshold <= 0) {
    // 0 이하 입력 시 문서 자체 삭제 (안전재고 미설정 상태로 복원)
    await deleteDoc(doc(db, COLLECTION, productId));
    return;
  }
  await setDoc(
    doc(db, COLLECTION, productId),
    {
      productId,
      threshold,
      updatedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function removeSafetyStock(productId: string) {
  await deleteDoc(doc(db, COLLECTION, productId));
}
