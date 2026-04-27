"use server";

// =====================================================================
// 마스터 관리자 등록 — 첫 가입자 셀프 부트스트랩
//
// 동작:
//   1. 클라이언트가 Firebase ID 토큰을 함께 호출
//   2. Admin SDK 로 토큰 검증 → uid 획득
//   3. shop_admins 컬렉션이 비어있으면 본인을 owner 로 등록
//   4. 이미 누군가 마스터면 거부
//
// 보안:
//   - shop_admins.write: false (rules) — 클라이언트는 절대 직접 쓰지 못함
//   - 이 Server Action 만이 Admin SDK 권한으로 등록 가능
// =====================================================================

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export interface ClaimMasterAdminResult {
  success: boolean;
  message: string;
}

export async function claimMasterAdmin(
  idToken: string,
): Promise<ClaimMasterAdminResult> {
  if (!idToken) {
    return { success: false, message: "인증 토큰이 비어있습니다." };
  }

  // 1. ID 토큰 검증
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch {
    return { success: false, message: "인증 토큰이 유효하지 않습니다." };
  }
  const uid = decoded.uid;

  const adminsRef = adminDb().collection("shop_admins");

  // 2. 컬렉션이 비어있는지 확인
  const existing = await adminsRef.limit(1).get();
  if (!existing.empty) {
    // 이미 누군가 owner 면, 본인이 그 owner 인 경우만 success 처리
    const selfDoc = await adminsRef.doc(uid).get();
    if (selfDoc.exists) {
      return {
        success: true,
        message: "이미 마스터 관리자로 등록된 계정입니다.",
      };
    }
    return {
      success: false,
      message:
        "이미 다른 계정이 마스터 관리자로 지정되어 있습니다. 마스터에게 권한 추가를 요청해주세요.",
    };
  }

  // 3. 본인을 owner 로 등록
  await adminsRef.doc(uid).set({
    uid,
    email: decoded.email ?? null,
    role: "owner",
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: "마스터 관리자로 등록되었습니다.",
  };
}
