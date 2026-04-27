// =====================================================================
// 상품 큐레이션 (관리자용)
// 컬렉션: shop_listings/{productId}
//
// 쇼핑몰에 노출할 상품을 ERP `products` 와 별개로 관리합니다.
// ERP 의 products.hidden / isDeleted 플래그를 한 번 더 존중합니다.
// =====================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import type { ShopListing } from "@/types";

export async function getAllListings(): Promise<Map<string, ShopListing>> {
  const map = new Map<string, ShopListing>();
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return map;

  const snap = await getDocs(collection(db, "shop_listings"));
  snap.forEach((d) => {
    map.set(d.id, d.data() as ShopListing);
  });
  return map;
}

export async function getListing(
  productId: string,
): Promise<ShopListing | null> {
  const snap = await getDoc(doc(db, "shop_listings", productId));
  if (!snap.exists()) return null;
  return snap.data() as ShopListing;
}

export interface UpdateListingInput {
  productId: string;
  published: boolean;
  order?: number;
  featured?: boolean;
  adminUid: string;
  unpublishReason?: string;
}

export async function upsertListing(input: UpdateListingInput) {
  const { productId, adminUid, ...rest } = input;
  await setDoc(
    doc(db, "shop_listings", productId),
    {
      productId,
      ...rest,
      listedBy: adminUid,
      listedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
