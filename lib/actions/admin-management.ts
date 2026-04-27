"use server";

// =====================================================================
// 관리자 관리 — 마스터(owner) 만 호출 가능
//
// 모든 액션이 ID 토큰을 받아 verifyIdToken 으로 호출자 검증 후,
// 호출자가 owner 인지 확인합니다.
// =====================================================================

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

async function verifyOwner(idToken: string): Promise<{ uid: string } | null> {
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    const adminDoc = await adminDb()
      .collection("shop_admins")
      .doc(decoded.uid)
      .get();
    if (!adminDoc.exists) return null;
    if (adminDoc.data()?.role !== "owner") return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

export interface AdminListItem {
  uid: string;
  email: string | null;
  loginId: string | null;
  name: string | null;
  role: "owner" | "admin";
  createdAt: number | null;
}

export async function listAdminsAction(
  idToken: string,
): Promise<ActionResult<AdminListItem[]>> {
  // 일반 admin 도 목록은 볼 수 있게 (owner 만 수정 가능)
  let callerUid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    const adminDoc = await adminDb()
      .collection("shop_admins")
      .doc(decoded.uid)
      .get();
    if (!adminDoc.exists) {
      return { success: false, message: "관리자 권한이 없습니다." };
    }
    callerUid = decoded.uid;
  } catch {
    return { success: false, message: "인증 실패" };
  }

  const adminsSnap = await adminDb().collection("shop_admins").get();
  const items: AdminListItem[] = [];
  for (const doc of adminsSnap.docs) {
    const a = doc.data();
    // 매칭되는 회원 프로필 조회 (loginId, name)
    const customerSnap = await adminDb()
      .collection("shop_customers")
      .doc(doc.id)
      .get();
    const c = customerSnap.exists ? customerSnap.data() : null;
    items.push({
      uid: doc.id,
      email: (a.email as string | undefined) ?? c?.email ?? null,
      loginId: (c?.loginId as string | undefined) ?? null,
      name: (c?.name as string | undefined) ?? null,
      role: (a.role as "owner" | "admin") ?? "admin",
      createdAt:
        a.createdAt && typeof a.createdAt.toMillis === "function"
          ? a.createdAt.toMillis()
          : null,
    });
  }

  // owner 우선, 그 다음 createdAt 오름차순
  items.sort((a, b) => {
    if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
    return (a.createdAt ?? 0) - (b.createdAt ?? 0);
  });

  return { success: true, message: "OK", data: items };
}

export async function addAdminAction(
  idToken: string,
  loginId: string,
): Promise<ActionResult> {
  const owner = await verifyOwner(idToken);
  if (!owner) return { success: false, message: "마스터 관리자 권한이 필요합니다." };

  const cleanLoginId = loginId.trim();
  if (!cleanLoginId) return { success: false, message: "아이디를 입력해주세요." };

  // loginId 로 회원 찾기
  const cs = await adminDb()
    .collection("shop_customers")
    .where("loginId", "==", cleanLoginId)
    .limit(1)
    .get();
  if (cs.empty) {
    return { success: false, message: "해당 아이디의 회원을 찾을 수 없습니다." };
  }
  const customer = cs.docs[0];
  const uid = customer.id;
  const email = (customer.data().email as string | undefined) ?? null;

  // 이미 admin 인지 확인
  const existing = await adminDb().collection("shop_admins").doc(uid).get();
  if (existing.exists) {
    return { success: false, message: "이미 관리자로 등록된 회원입니다." };
  }

  await adminDb().collection("shop_admins").doc(uid).set({
    uid,
    email,
    role: "admin",
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, message: `${cleanLoginId} 님을 관리자로 등록했습니다.` };
}

export async function removeAdminAction(
  idToken: string,
  targetUid: string,
): Promise<ActionResult> {
  const owner = await verifyOwner(idToken);
  if (!owner) return { success: false, message: "마스터 관리자 권한이 필요합니다." };

  if (targetUid === owner.uid) {
    return { success: false, message: "마스터 본인 계정은 삭제할 수 없습니다." };
  }

  const target = await adminDb().collection("shop_admins").doc(targetUid).get();
  if (!target.exists) {
    return { success: false, message: "해당 관리자를 찾을 수 없습니다." };
  }
  if (target.data()?.role === "owner") {
    return { success: false, message: "마스터 권한 계정은 삭제할 수 없습니다." };
  }

  await adminDb().collection("shop_admins").doc(targetUid).delete();
  return { success: true, message: "관리자 권한이 회수되었습니다." };
}
