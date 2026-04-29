import type { MetadataRoute } from "next";

import { adminDb } from "@/lib/firebaseAdmin";
import type { Product, ShopCollection } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cubomall.kr";

// 1시간마다 재생성 (Next.js ISR)
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];

  // Admin SDK 환경변수 없으면 정적만 반환
  if (
    !process.env.FIREBASE_ADMIN_PROJECT_ID ||
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    !process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return staticUrls;
  }

  const dynamicUrls: MetadataRoute.Sitemap = [];

  try {
    // 공개 컬렉션 페이지
    const collectionsSnap = await adminDb()
      .collection("shop_collections")
      .where("isPublic", "==", true)
      .get();
    for (const doc of collectionsSnap.docs) {
      const c = doc.data() as ShopCollection;
      const lastModified = c.updatedAt?.toDate?.() ?? now;
      dynamicUrls.push({
        url: `${BASE_URL}/collections/${c.id}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.warn("[sitemap] collections fetch failed", err);
  }

  try {
    // ON 태그 + isShoppable 통과한 상품 페이지
    const productsSnap = await adminDb().collection("products").get();
    for (const doc of productsSnap.docs) {
      const p = doc.data() as Product;
      if (
        p.isDeleted === true ||
        p.hidden === true ||
        !p.tags?.includes("ON")
      ) {
        continue;
      }
      // createdAt 은 number (ms) — 타입 정의 그대로
      const lastModified =
        typeof p.createdAt === "number" ? new Date(p.createdAt) : now;
      dynamicUrls.push({
        url: `${BASE_URL}/products/${doc.id}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.warn("[sitemap] products fetch failed", err);
  }

  return [...staticUrls, ...dynamicUrls];
}
