"use server";

// =====================================================================
// 영업링크 (shop_sales_links/{code}) 카운트 Server Actions
//
// 정책:
//   - 클라이언트는 shop_sales_links 를 직접 write 못 함 (rules write=false)
//   - Admin SDK 로만 visits/signups 증가
//   - 존재하지 않는 code 는 조용히 무시 (스팸 방지)
//   - 같은 세션 내 중복 증가는 클라이언트 sales-ref.ts 에서 차단
// =====================================================================

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface ActionResult {
  success: boolean;
  message?: string;
}

/** ?ref=<code> 진입 시 visits 증가. 존재하지 않는 코드는 무시. */
export async function recordSalesLinkVisitAction(
  code: string,
): Promise<ActionResult> {
  if (!code || !/^[A-Za-z0-9_-]{1,64}$/.test(code)) {
    return { success: false, message: "잘못된 코드" };
  }
  const ref = adminDb().collection("shop_sales_links").doc(code);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, message: "코드 없음" };
  if (snap.data()?.active === false) return { success: false, message: "비활성" };
  await ref.update({
    visits: FieldValue.increment(1),
    lastVisitedAt: FieldValue.serverTimestamp(),
  });
  return { success: true };
}

/**
 * 가입 완료 시점에 호출.
 *   - shop_sales_links/{code}.signups++
 *   - shop_customers/{uid}.salesRef = code
 *
 * 호출자는 가입 직후의 사용자 idToken 과 code 를 함께 보냄.
 * code 가 비어있거나 잘못된 경우 정상 결과로 무시 (가입 자체는 성공시켜야 함).
 */
export async function recordSalesLinkSignupAction(input: {
  idToken: string;
  code: string;
}): Promise<ActionResult> {
  if (!input.code || !/^[A-Za-z0-9_-]{1,64}$/.test(input.code)) {
    return { success: true, message: "ref 없음 — 귀속 없이 가입" };
  }
  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(input.idToken);
    uid = decoded.uid;
  } catch {
    return { success: false, message: "인증 실패" };
  }
  const linkRef = adminDb().collection("shop_sales_links").doc(input.code);
  const linkSnap = await linkRef.get();
  if (!linkSnap.exists) {
    return { success: true, message: "유효하지 않은 ref — 무시" };
  }
  // 동시 처리 안전: 두 write 를 batch 로
  const batch = adminDb().batch();
  batch.update(linkRef, {
    signups: FieldValue.increment(1),
    lastSignupAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    adminDb().collection("shop_customers").doc(uid),
    {
      salesRef: input.code,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
  return { success: true };
}
