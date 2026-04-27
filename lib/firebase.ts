// =====================================================================
// Firebase Web SDK (클라이언트) 초기화
//
// ⚠️ DB 공유 원칙 — 절대 어기지 말 것
//   • cuboerp 와 동일한 Firebase 프로젝트를 공유합니다.
//   • ERP 의 컬렉션 (`products`, `orders`, `users`, `entities` 등) 은
//     **읽기 전용** 으로만 접근합니다 (특히 `products` 만 사용).
//   • 쇼핑몰 전용 컬렉션은 반드시 `shop_` 접두사를 사용합니다
//     (`shop_customers`, `shop_orders`, `shop_carts`).
//   • `products.stock` 차감은 결제 확정 시점에 서버 SDK 의 트랜잭션으로만 수행
//     (이 클라이언트 모듈에서는 차감 코드를 작성하지 않습니다).
// =====================================================================

import { getApps, getApp, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);
