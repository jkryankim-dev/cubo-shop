// =====================================================================
// 컬렉션 (큐레이션 페이지) 데이터 액세스
//
// 컬렉션: shop_collections/{collectionId}
//
// 누구나 read (사이트 노출용), 관리자만 write (firestore.rules 가드).
// =====================================================================

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import type { ShopCollection } from "@/types";

const COLLECTION = "shop_collections";

/**
 * 홈 화면에 띄울 "추천 컬렉션" 의 고정 ID.
 *
 * 이 ID 의 컬렉션은 다음과 같이 특별 취급됩니다:
 *  - 홈 (`/`) 의 추천 그리드가 이 컬렉션의 productIds 를 그대로 사용.
 *  - "한 상품 = 한 컬렉션" 정책의 예외 — 다른 컬렉션에 이미 있는 상품도
 *    추천 컬렉션에는 추가 가능.
 */
export const FEATURED_COLLECTION_ID = "featured";

export function isFeaturedCollection(c: { id: string }): boolean {
  return c.id === FEATURED_COLLECTION_ID;
}

export async function listCollections(opts?: {
  publicOnly?: boolean;
}): Promise<ShopCollection[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return [];
  const colRef = collection(db, COLLECTION);
  const q = opts?.publicOnly
    ? query(colRef, where("isPublic", "==", true))
    : colRef;
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => d.data() as ShopCollection);
  items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return items;
}

export async function getCollection(
  id: string,
): Promise<ShopCollection | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return snap.data() as ShopCollection;
}

export interface CreateCollectionInput {
  id: string;
  name: string;
  description?: string;
  order?: number;
  isPublic?: boolean;
  createdBy: string;
}

export async function createCollection(input: CreateCollectionInput) {
  const id = input.id.trim();
  if (!id) throw new Error("컬렉션 ID 가 비어있습니다.");
  if (!/^[a-z0-9-]+$/.test(id))
    throw new Error("컬렉션 ID 는 영문 소문자/숫자/하이픈만 사용 가능합니다.");

  const existing = await getDoc(doc(db, COLLECTION, id));
  if (existing.exists()) {
    throw new Error(`이미 존재하는 컬렉션 ID 입니다: ${id}`);
  }

  await setDoc(doc(db, COLLECTION, id), {
    id,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    productIds: [],
    order: input.order ?? 999,
    isPublic: input.isPublic ?? true,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export interface UpdateCollectionInput {
  id: string;
  name?: string;
  description?: string;
  productIds?: string[];
  order?: number;
  isPublic?: boolean;
}

export async function updateCollection(input: UpdateCollectionInput) {
  const { id, ...patch } = input;
  await updateDoc(doc(db, COLLECTION, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCollection(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** 슬러그 자동 생성 (한국어 이름 → 영문 hash 또는 기본값) */
export function suggestSlug(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  // 한글 포함이면 빈 슬러그 가능 — 사용자 직접 입력 유도
  if (!/^[a-z0-9-]+$/.test(cleaned)) return "";
  return cleaned;
}
