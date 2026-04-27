// =====================================================================
// 팝빌 (POPBILL) — 카카오 알림톡 발송용 헬퍼
//
// 서버 전용 모듈입니다 (popbill 패키지가 Node.js 서비스 SDK).
// 클라이언트 컴포넌트에서 import 하면 빌드 에러가 납니다.
//
// 환경변수:
//   POPBILL_LINKID, POPBILL_SECRETKEY  — 팝빌 발급 (cuboerp 와 공유 가능)
//   POPBILL_USERID                     — 팝빌 회원 ID
//   POPBILL_SENDER_PHONE               — 사전 등록된 발신번호
// =====================================================================

import "server-only";

// popbill 은 자체 .d.ts 가 없어서 명시적 require 사용.
// (동적 require 라 Next.js 가 클라이언트 번들에 포함시키지 않음)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const popbill = require("popbill") as PopbillModule;

interface PopbillModule {
  config(opts: PopbillConfig): void;
  KakaoService(): KakaoService;
}

interface PopbillConfig {
  LinkID: string;
  SecretKey: string;
  IsTest: boolean;
  IPRestrictOnOff?: boolean;
  UseStaticIP?: boolean;
  UseLocalTimeYN?: boolean;
}

// popbill 의 KakaoService 시그니처는 라이브러리 문서를 참고하세요.
// 여기서는 sendATS_one (단건 알림톡) 만 사용합니다.
interface KakaoService {
  sendATS_one(
    CorpNum: string,
    TemplateCode: string,
    Sender: string,
    Receiver: string,
    ReceiverName: string,
    Msg: string,
    AltMsg: string,
    AltSendType: string,
    SndDT: string,
    success: (receiptNum: string) => void,
    fail: (error: { code: number; message: string }) => void,
  ): void;
}

let configured = false;
let kakaoService: KakaoService | null = null;

function ensureConfig() {
  if (configured) return;
  const linkId = process.env.POPBILL_LINKID;
  const secretKey = process.env.POPBILL_SECRETKEY;
  if (!linkId || !secretKey) {
    throw new Error(
      "팝빌 환경변수 (POPBILL_LINKID, POPBILL_SECRETKEY) 가 비어있습니다.",
    );
  }
  popbill.config({
    LinkID: linkId,
    SecretKey: secretKey,
    IsTest: process.env.NODE_ENV !== "production",
    IPRestrictOnOff: false,
    UseStaticIP: false,
    UseLocalTimeYN: true,
  });
  configured = true;
}

function getKakao(): KakaoService {
  ensureConfig();
  if (!kakaoService) {
    kakaoService = popbill.KakaoService();
  }
  return kakaoService;
}

export interface AlimtalkInput {
  templateCode: string;
  receiverPhone: string;
  receiverName?: string;
  message: string;
  /** 알림톡 실패 시 대체 SMS 메시지 (기본: message 와 동일) */
  altMessage?: string;
}

/**
 * 카카오 알림톡 단건 발송. 영수증 번호 반환.
 *
 * 운영 단계 (결제 완료, 배송 시작 등) 에서 Route Handler 또는 Server Action 에서
 * 호출하세요. 클라이언트에서 직접 호출 X.
 */
export function sendAlimtalk(input: AlimtalkInput): Promise<string> {
  const userId = process.env.POPBILL_USERID;
  const senderPhone = process.env.POPBILL_SENDER_PHONE;
  if (!userId || !senderPhone) {
    return Promise.reject(
      new Error(
        "팝빌 환경변수 (POPBILL_USERID, POPBILL_SENDER_PHONE) 가 비어있습니다.",
      ),
    );
  }

  const kakao = getKakao();

  return new Promise<string>((resolve, reject) => {
    kakao.sendATS_one(
      userId,
      input.templateCode,
      senderPhone,
      input.receiverPhone,
      input.receiverName ?? "",
      input.message,
      input.altMessage ?? input.message,
      "A", // 대체발송 타입: A=알림톡 우선
      "",
      (receiptNum) => resolve(receiptNum),
      (err) =>
        reject(new Error(`팝빌 알림톡 발송 실패 [${err.code}]: ${err.message}`)),
    );
  });
}
