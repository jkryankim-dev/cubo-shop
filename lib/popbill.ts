// =====================================================================
// 팝빌 (POPBILL) 초기화 — cuboerp 와 동일 계정·발신번호 공유
//
// 발신 주체: 쿠보유통 (CorpNum 1708503147 / Popbill UserID cubo01)
// 운영 메시지는 모두 쿠보유통 명의로 발송됩니다.
//
// ⚠️ 본 모듈은 서버 전용 — 클라이언트 import 금지.
// =====================================================================

import "server-only";

// popbill 패키지에 .d.ts 가 없어서 require + 타입 선언으로 처리.
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

// sendATS_one 시그니처 (사용자 인터페이스 가이드 기준)
export interface KakaoService {
  sendATS_one(
    CorpNum: string,
    TemplateCode: string,
    SenderNum: string,
    Content: string,
    AltSubject: string,
    AltContent: string,
    AltSendType: string,
    SndDT: string,
    ReceiverNum: string,
    ReceiverName: string,
    UserID: string,
    RequestNum: string | null,
    Btns: unknown[] | null,
    success: (receiptNum: string) => void,
    fail: (error: { code: number; message: string }) => void,
  ): void;
}

let configured = false;

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
    IsTest: process.env.POPBILL_IS_TEST === "true",
    UseLocalTimeYN: true,
    UseStaticIP: false,
    // Netlify 등 동적 IP 환경에서는 false 권장
    IPRestrictOnOff: process.env.POPBILL_IP_RESTRICT === "true",
  });
  configured = true;
}

export function getKakaoService(): KakaoService {
  ensureConfig();
  return popbill.KakaoService();
}

export const POPBILL = {
  /** 쿠보유통 사업자등록번호 (하이픈 제거) — 발송 주체 */
  DistributorCorpNum:
    process.env.POPBILL_DISTRIBUTOR_CORPNUM || "1708503147",
  /** 쿠보유통 팝빌 연동 아이디 */
  DistributorUserID: process.env.POPBILL_DISTRIBUTOR_USERID || "cubo01",
  /** 사전 등록된 발신번호 (cuboerp 와 동일) */
  SenderPhone: process.env.POPBILL_SENDER_PHONE || "",
} as const;
