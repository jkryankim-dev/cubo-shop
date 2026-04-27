// =====================================================================
// 관리자용 데이터 액세스 (클라이언트 SDK)
//
// firestore.rules 의 isAdmin() 가드 덕분에 클라이언트에서 호출 가능.
// 관리자 본인 uid 가 shop_admins/{uid} 에 있어야 함.
// =====================================================================

import {
  collection,
  doc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import type { ShopCustomer, ShopOrder, ShopOrderStatus } from "@/types";

export async function listAllCustomers(): Promise<ShopCustomer[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return [];
  const snap = await getDocs(collection(db, "shop_customers"));
  return snap.docs.map((d) => d.data() as ShopCustomer);
}

export interface ReviewLicenseInput {
  uid: string;
  approve: boolean;
  reviewerUid: string;
  rejectionReason?: string;
}

export async function reviewBusinessLicense(input: ReviewLicenseInput) {
  const ref = doc(db, "shop_customers", input.uid);
  if (input.approve) {
    await updateDoc(ref, {
      grade: "business",
      "businessLicense.status": "approved",
      "businessLicense.reviewedAt": serverTimestamp(),
      "businessLicense.reviewerUid": input.reviewerUid,
      "businessLicense.rejectionReason": null,
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      "businessLicense.status": "rejected",
      "businessLicense.reviewedAt": serverTimestamp(),
      "businessLicense.reviewerUid": input.reviewerUid,
      "businessLicense.rejectionReason":
        input.rejectionReason ?? "검토 후 반려되었습니다.",
      updatedAt: serverTimestamp(),
    });
  }
}

// ---------------------------------------------------------------------
// 주문
// ---------------------------------------------------------------------
export async function listAllOrders(): Promise<ShopOrder[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return [];
  const q = query(
    collection(db, "shop_orders"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShopOrder);
}

export async function listRecentOrders(count = 5): Promise<ShopOrder[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return [];
  const q = query(
    collection(db, "shop_orders"),
    orderBy("createdAt", "desc"),
    fbLimit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShopOrder);
}

export async function listOrdersByStatus(
  status: ShopOrderStatus,
): Promise<ShopOrder[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return [];
  const q = query(
    collection(db, "shop_orders"),
    where("status", "==", status),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShopOrder);
}

export interface UpdateOrderInput {
  orderId: string;
  status?: ShopOrderStatus;
  trackingNumber?: string;
  carrier?: string;
}

export async function updateOrder(input: UpdateOrderInput) {
  const ref = doc(db, "shop_orders", input.orderId);
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.status) patch.status = input.status;
  if (input.trackingNumber !== undefined)
    patch.trackingNumber = input.trackingNumber;
  if (input.carrier !== undefined) patch.carrier = input.carrier;
  await updateDoc(ref, patch);
}

// ---------------------------------------------------------------------
// 통계 (간단)
// ---------------------------------------------------------------------
export interface AdminStats {
  totalCustomers: number;
  businessCustomers: number;
  pendingLicenseReviews: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const empty: AdminStats = {
    totalCustomers: 0,
    businessCustomers: 0,
    pendingLicenseReviews: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  };
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return empty;

  const [customers, orders] = await Promise.all([
    listAllCustomers(),
    listAllOrders(),
  ]);

  return {
    totalCustomers: customers.length,
    businessCustomers: customers.filter((c) => c.grade === "business").length,
    pendingLicenseReviews: customers.filter(
      (c) => c.businessLicense?.status === "pending",
    ).length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(
      (o) => o.status === "pending" || o.status === "paid",
    ).length,
    totalRevenue: orders
      .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
      .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0),
  };
}
