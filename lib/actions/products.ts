"use server";

// =====================================================================
// 상품 메타 수정 Server Action — ERP `products` 컬렉션 부분 쓰기
//
// ⚠️ 정책 분기점:
//   원래 cubo-shop 은 `products` 컬렉션 read-only 였음. 본 액션이 그 원칙의
//   첫 예외. 이후 다른 필드 쓰기가 추가될 때는 반드시 ERP 측과 사전 합의 후
//   본 파일에 추가할 것.
//
// 허용 필드: manufacturer, origin (둘 다 string, 빈 문자열 허용 = 미설정 복원)
//   - manufacturer/origin 이 빈 값이면 product 문서에서 해당 키 삭제 (deleteField)
//   - 그 외 모든 필드는 본 액션이 무시함 (request body 에 와도 저장 X)
//
// 인증: shop_admins/{uid} 에 등록된 관리자만.
// =====================================================================

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface ActionResult {
  success: boolean;
  message: string;
}

async function verifyAdmin(idToken: string): Promise<string | null> {
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    const adminDoc = await adminDb()
      .collection("shop_admins")
      .doc(decoded.uid)
      .get();
    return adminDoc.exists ? decoded.uid : null;
  } catch {
    return null;
  }
}

export interface UpdateProductMetaInput {
  idToken: string;
  productId: string;
  /** 빈 문자열이면 필드 삭제 (= "중국" 기본값으로 복원). undefined 면 미변경. */
  manufacturer?: string;
  origin?: string;
}

export async function updateProductMetaAction(
  input: UpdateProductMetaInput,
): Promise<ActionResult> {
  const adminUid = await verifyAdmin(input.idToken);
  if (!adminUid)
    return { success: false, message: "관리자 권한이 필요합니다." };

  const productRef = adminDb().collection("products").doc(input.productId);
  const productSnap = await productRef.get();
  if (!productSnap.exists) {
    return { success: false, message: "상품을 찾을 수 없습니다." };
  }

  // 화이트리스트: manufacturer / origin 두 필드만.
  // 다른 필드는 input 에 포함되어 있어도 patch 에 들어가지 않음.
  const patch: Record<string, unknown> = {};
  if (input.manufacturer !== undefined) {
    const v = input.manufacturer.trim();
    patch.manufacturer = v === "" ? FieldValue.delete() : v;
  }
  if (input.origin !== undefined) {
    const v = input.origin.trim();
    patch.origin = v === "" ? FieldValue.delete() : v;
  }

  if (Object.keys(patch).length === 0) {
    return { success: false, message: "변경할 내용이 없습니다." };
  }

  // 감사 로그용 (선택). 다른 필드는 ERP 가 관리하므로 updatedAt 은 일부러 안 건드림.
  patch.shopMetaUpdatedAt = FieldValue.serverTimestamp();
  patch.shopMetaUpdatedBy = adminUid;

  await productRef.update(patch);

  return { success: true, message: "저장되었습니다." };
}
