"use server";

// =====================================================================
// ERP 비가맹 회원 로그인 + lazy 마이그레이션
//
// 흐름:
//   1) 클라이언트 로그인 폼에서 cubo-shop 자체 가입 (fake email) 우선 시도
//   2) 실패 (auth/user-not-found) 시 본 액션으로 fallback
//   3) ERP users 컬렉션에서 SHA-256 비번 검증 (잠금 계정은 contact 숫자만)
//   4) 통과 → Firebase 커스텀 토큰 발급 + ERP entities → shop_customers 매핑
//   5) 클라이언트가 signInWithCustomToken(token)
//
// 보안:
//   - ERP `users` 컬렉션은 rules 상 본인+MASTER 만 client read 가능
//     → cubo-shop 은 반드시 Admin SDK 로만 접근, 평문 비번을 client 에 노출 X
//   - 본 액션은 stateless. 비번 brute-force 방어는 추후 IP-based rate limit 검토.
// =====================================================================

import { createHash } from "node:crypto";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

import { logServerError } from "@/lib/error-logger";

interface LoginResult {
  success: boolean;
  message: string;
  /** 클라이언트가 signInWithCustomToken 으로 사용 */
  customToken?: string;
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

interface ErpUser {
  pw?: string;
  id?: string;
  username?: string;
  status?: "ACTIVE" | "PENDING" | "BANNED" | string;
  passwordLocked?: boolean;
  contact?: string;
  entityId?: string;
  managedEntityIds?: string[];
  name?: string;
}

interface ErpEntity {
  name?: string;
  regNumber?: string;
  representative?: string;
  address?: string;
  bizType?: string;
  bizClass?: string;
  email?: string;
  taxEmail?: string;
  mobile?: string;
  category?: string;
}

/**
 * 로그인 ID 로 users 문서 찾기. 우선순위: docId → 'id' 필드 → 'username' 필드.
 * 못 찾으면 null.
 */
async function findErpUser(
  loginId: string,
): Promise<{ docId: string; data: ErpUser } | null> {
  const usersRef = adminDb().collection("users");

  // 1) 문서 ID = loginId
  const byDocId = await usersRef.doc(loginId).get();
  if (byDocId.exists) {
    return { docId: byDocId.id, data: byDocId.data() as ErpUser };
  }

  // 2) 'id' 필드
  const byIdField = await usersRef.where("id", "==", loginId).limit(1).get();
  if (!byIdField.empty) {
    const d = byIdField.docs[0];
    return { docId: d.id, data: d.data() as ErpUser };
  }

  // 3) 'username' 필드
  const byUsername = await usersRef
    .where("username", "==", loginId)
    .limit(1)
    .get();
  if (!byUsername.empty) {
    const d = byUsername.docs[0];
    return { docId: d.id, data: d.data() as ErpUser };
  }

  return null;
}

/** 비번 검증 (잠금 계정은 contact 숫자, 일반은 SHA-256 또는 평문 호환). */
function verifyPassword(input: string, user: ErpUser): boolean {
  if (!user.pw) return false;
  if (user.passwordLocked) {
    const digits = (user.contact ?? "").replace(/\D/g, "");
    if (!digits) return false;
    return sha256Hex(digits) === user.pw || digits === user.pw;
  }
  return sha256Hex(input) === user.pw || input === user.pw;
}

/**
 * ERP entities → shop_customers 매핑 (최초 로그인 시 또는 미반영 시).
 * shop_customers/{uid} 가 이미 충분히 채워져 있으면 (taxInvoiceInfo 보유) skip.
 * erpEntityId 는 항상 갱신 (없으면 박음).
 */
async function migrateErpUser(uid: string, user: ErpUser): Promise<void> {
  const entityId = user.entityId || user.managedEntityIds?.[0];
  if (!entityId) return; // 연결된 entity 없으면 마이그레이션 skip

  const customerRef = adminDb().collection("shop_customers").doc(uid);
  const customerSnap = await customerRef.get();
  const existing = customerSnap.exists
    ? (customerSnap.data() as Record<string, unknown>)
    : null;

  // 이미 마이그레이션 완료된 경우 (erpEntityId + taxInvoiceInfo) → skip
  if (existing?.erpEntityId && existing?.taxInvoiceInfo) {
    return;
  }

  const entitySnap = await adminDb()
    .collection("entities")
    .doc(entityId)
    .get();
  if (!entitySnap.exists) {
    // entity 가 없으면 최소 정보만 박음
    await customerRef.set(
      {
        uid,
        loginId: user.id || user.username || uid,
        email: existing?.email ?? "",
        name: user.name || uid,
        phone: user.contact || "",
        grade: "business",
        erpEntityId: entityId,
        createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  const entity = entitySnap.data() as ErpEntity;
  const email = entity.taxEmail || entity.email || (existing?.email as string) || "";
  const phone = entity.mobile || user.contact || "";
  const taxInvoiceInfo = {
    businessRegNo: entity.regNumber ?? "",
    ceo: entity.representative ?? "",
    companyName: entity.name ?? "",
    industry: entity.bizClass ?? "",
    businessType: entity.bizType ?? "",
    address: {
      postcode: "",
      address1: entity.address ?? "",
    },
    email,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await customerRef.set(
    {
      uid,
      loginId: user.id || user.username || uid,
      email,
      name: user.name || entity.representative || uid,
      phone,
      companyName: entity.name ?? undefined,
      grade: "business",
      erpEntityId: entityId,
      taxInvoiceInfo,
      createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function erpLoginAction(input: {
  loginId: string;
  password: string;
}): Promise<LoginResult> {
  try {
    return await erpLoginImpl(input);
  } catch (err) {
    console.error("[erp-login] 처리 실패", err);
    void logServerError({
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: "erpLoginAction",
    });
    return {
      success: false,
      message: "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

async function erpLoginImpl(input: {
  loginId: string;
  password: string;
}): Promise<LoginResult> {
  const loginId = input.loginId?.trim();
  const password = input.password ?? "";
  if (!loginId || !password) {
    return { success: false, message: "아이디·비밀번호를 입력해주세요." };
  }

  const found = await findErpUser(loginId);
  if (!found) {
    return { success: false, message: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  if (found.data.status === "PENDING") {
    return { success: false, message: "승인 대기 중인 계정입니다." };
  }
  if (found.data.status === "BANNED") {
    return { success: false, message: "정지된 계정입니다." };
  }

  if (!verifyPassword(password, found.data)) {
    return { success: false, message: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  // Firebase Auth user 가 없으면 만들기 (uid = ERP users 문서 ID 로 통일)
  const uid = found.docId;
  try {
    await adminAuth().getUser(uid);
  } catch {
    try {
      await adminAuth().createUser({
        uid,
        displayName: found.data.name ?? uid,
      });
    } catch (err) {
      return {
        success: false,
        message: `Auth 사용자 생성 실패: ${err instanceof Error ? err.message : "unknown"}`,
      };
    }
  }

  // shop_customers 매핑 (lazy migration)
  try {
    await migrateErpUser(uid, found.data);
  } catch (err) {
    console.warn("[erp-login] migration 실패 — 로그인은 진행", err);
  }

  // 커스텀 토큰 발급
  const customToken = await adminAuth().createCustomToken(uid);
  return {
    success: true,
    message: "로그인 성공",
    customToken,
  };
}
