// =====================================================================
// 인증 헬퍼 (클라이언트)
//
// 한국형 ID/PW 가입을 Firebase Auth (이메일 기반) 위에 얹기 위해
// `${loginId}@cubo.shop.local` 같은 가짜 이메일을 Auth 식별자로 사용합니다.
// 실제 사용자 정보 (이메일, 이름 등) 는 Firestore `shop_customers/{uid}` 에 저장.
// =====================================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type UserCredential,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { auth, db, storage } from "./firebase";
import type {
  BusinessLicense,
  ShopCustomer,
  ShippingAddress,
} from "@/types";

const FAKE_EMAIL_DOMAIN = "cubo.shop.local";

export const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/;

export function loginIdToAuthEmail(loginId: string): string {
  return `${loginId.toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}

// ---------------------------------------------------------------------
// 회원가입
// ---------------------------------------------------------------------
export interface SignUpInput {
  loginId: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  address: ShippingAddress;
}

export async function signUp(input: SignUpInput): Promise<UserCredential> {
  if (!LOGIN_ID_PATTERN.test(input.loginId)) {
    throw new Error("아이디는 영문/숫자/_ 4~20자로 입력해주세요.");
  }
  if (input.password.length < 8) {
    throw new Error("비밀번호는 8자 이상이어야 합니다.");
  }

  const authEmail = loginIdToAuthEmail(input.loginId);
  const cred = await createUserWithEmailAndPassword(
    auth,
    authEmail,
    input.password,
  );

  const customer: ShopCustomer = {
    uid: cred.user.uid,
    loginId: input.loginId,
    authEmail,
    email: input.email,
    name: input.name,
    phone: input.phone,
    phoneVerified: false,
    defaultAddress: input.address,
    grade: "general",
  };

  await setDoc(doc(db, "shop_customers", cred.user.uid), {
    ...customer,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return cred;
}

// ---------------------------------------------------------------------
// 로그인 / 로그아웃
// ---------------------------------------------------------------------
export async function signIn(loginId: string, password: string) {
  const authEmail = loginIdToAuthEmail(loginId);
  return signInWithEmailAndPassword(auth, authEmail, password);
}

export async function signOut() {
  return fbSignOut(auth);
}

// ---------------------------------------------------------------------
// 고객 프로필 조회
// ---------------------------------------------------------------------
export async function getCustomerProfile(
  uid: string,
): Promise<ShopCustomer | null> {
  const snap = await getDoc(doc(db, "shop_customers", uid));
  if (!snap.exists()) return null;
  return snap.data() as ShopCustomer;
}

// ---------------------------------------------------------------------
// 사업자등록증 업로드 (회원가입 후 / 마이페이지에서 가능)
// ---------------------------------------------------------------------
export async function uploadBusinessLicense(
  uid: string,
  file: File,
): Promise<BusinessLicense> {
  const storagePath = `business-licenses/${uid}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const license: BusinessLicense = {
    url,
    storagePath,
    status: "pending",
  };

  await updateDoc(doc(db, "shop_customers", uid), {
    businessLicense: license,
    updatedAt: serverTimestamp(),
  });

  return license;
}

// ---------------------------------------------------------------------
// 관리자 여부 확인 (Firestore `shop_admins/{uid}` 존재 여부)
// ---------------------------------------------------------------------
export async function isShopAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "shop_admins", uid));
  return snap.exists();
}
