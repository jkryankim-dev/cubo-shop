// =====================================================================
// Firebase Admin SDK (서버 전용) 초기화
//
// ⚠️ 이 모듈은 클라이언트 컴포넌트에서 import 금지 (Node 전용).
//    서버 컴포넌트, Route Handler, Server Action 에서만 사용.
//
// ⚠️ DB 공유 원칙 — 어기면 ERP 데이터 손상 가능
//   • ERP 컬렉션 (`products` 등) 에 대한 **쓰기는 결제 확정 시 stock
//     차감 트랜잭션 한 가지만 허용**. 그 외 ERP 데이터 변경 금지.
//   • `orders` 는 ERP 의 주문이지 우리 주문이 아님. 우리 주문은 `shop_orders`.
//   • 쇼핑몰 신규 데이터는 모두 `shop_` 접두사 컬렉션에만 기록.
// =====================================================================

import {
  getApps,
  initializeApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // .env 의 \n 이스케이프를 실제 줄바꿈으로 복원
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin 환경변수가 비어있습니다. .env.local 의 FIREBASE_ADMIN_* 값을 확인하세요.",
    );
  }

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

let firestore: Firestore | undefined;

export function adminDb(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(getAdminApp());
  // undefined 필드를 자동 무시 — TypeScript 의 옵셔널 필드 패턴과 자연스럽게 호환.
  // (이걸 켜지 않으면 customerCompany 등 옵셔널 필드가 비었을 때 Firestore 가 throw)
  firestore.settings({ ignoreUndefinedProperties: true });
  return firestore;
}
