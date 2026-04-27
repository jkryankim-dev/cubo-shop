// =====================================================================
// 사업자 회원 등급 관리 (관리자 전용)
//
// firestore.rules 의 isAdmin() 가드 덕분에 클라이언트에서 호출 가능.
// 관리자 본인 uid 가 shop_admins/{uid} 에 있어야 함.
// =====================================================================

import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import type { ShopCustomer } from "@/types";

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
