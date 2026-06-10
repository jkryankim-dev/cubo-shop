// =====================================================================
// 사이트 공통 설정 (관리자 입력 기반)
//
// 컬렉션: shop_site_settings/{key}
// 누구나 read (결제 화면 등에서 사용), 쓰기는 관리자만 (rules 가드).
// =====================================================================

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import type { SitePaymentSettings } from "@/types";

const COLLECTION = "shop_site_settings";
const PAYMENT_DOC = "payment";

/** 무통장입금용 회사 법인계좌 설정 조회. 없으면 null. */
export async function getPaymentSettings(): Promise<SitePaymentSettings | null> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return null;
  const snap = await getDoc(doc(db, COLLECTION, PAYMENT_DOC));
  if (!snap.exists()) return null;
  return snap.data() as SitePaymentSettings;
}

export interface UpsertPaymentSettingsInput {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  noticeText?: string;
  updatedBy: string;
}

/** 무통장입금 계좌 정보 upsert (관리자 전용). */
export async function upsertPaymentSettings(
  input: UpsertPaymentSettingsInput,
): Promise<void> {
  const bankName = input.bankName.trim();
  const accountNumber = input.accountNumber.trim();
  const accountHolder = input.accountHolder.trim();
  if (!bankName || !accountNumber || !accountHolder) {
    throw new Error("은행명·계좌번호·예금주를 모두 입력해주세요.");
  }
  await setDoc(
    doc(db, COLLECTION, PAYMENT_DOC),
    {
      bankName,
      accountNumber,
      accountHolder,
      noticeText: input.noticeText?.trim() || "",
      updatedAt: serverTimestamp(),
      updatedBy: input.updatedBy,
    },
    { merge: true },
  );
}
