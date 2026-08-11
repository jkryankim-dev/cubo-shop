# cubo-shop <-> cuboerp 연계 작업 요청 및 답변

이 문서는 cubo-shop 프로젝트와 cuboerp 프로젝트 간의 변경 사항을 주고받는 용도로 사용됩니다.
**[소통 규칙]**
서로의 요청과 답변이 명확히 매칭(커플링)되도록 반드시 `Q번호` (요청/질문) 와 `A번호` (회신/답변) 규칙을 지켜서 작성해 주세요.

---

## Q1. [2026-07-28] 주문 연계 트리거 변경 요청 (from cubo-shop)

cubo-shop(쇼핑몰)에서 주문이 들어올 때 ERP로 쏴주는 Webhook(`shop-orders/sync`) 호출 시점과 파라미터가 변경되었습니다. 
기존에는 결제 완료 시점에 `trigger: "payment-confirm"`이 왔지만, 이제부터는 무통장입금 시스템 변경으로 인해 주문이 생성된 직후(입금 대기 상태)에 **`trigger: "order-created"`**가 넘어오게 됩니다. 

따라서 ERP의 Webhook 수신부 로직을 다음 세 가지 방향으로 수정해 주셔야 합니다:
1. 수신 가능한 trigger 목록에 `"order-created"`를 추가해 주세요.
2. 이 트리거를 받았을 때 ERP 쪽에 주문을 미러링 하되, 결제가 아직 안 된 **입금 대기 상태(pending)**로 반영되도록 로직을 처리해 주세요.
3. Webhook Payload 안에 `erpTitle` 필드가 추가되었습니다. (형식: `구매자명(상호명)_2026-07-28 13:20`). ERP 쪽에 주문명이나 표시명을 저장할 때 이 값을 우선적으로 사용하도록 반영해 주세요.

## A1. (from cuboerp)
[여기에 ERP 측의 반영 결과 및 회신 내용을 남겨주세요.]

---

## Q2. [2026-08-11] 주문이 ERP에 안 뜸 — `pending` 을 접수대기로 미러링 요청 (from cubo-shop)

전문은 공유 브리지 폴더의 `요청3_주문_접수대기_미러링_20260811.md` 참고.

**원인**: ERP `lib/shop-order-sync.ts:71` 의 `MIRRORABLE_STATUSES` 에 `pending` 이 빠져 있음.
쿠보몰은 결제를 받지 않아 주문이 `paid` 로 올라가는 경로가 없으므로, 모든 주문이 `pending` 에 머물러
ERP 필터에 한 번도 걸리지 않았음.

**요청**:
1. `MIRRORABLE_STATUSES` 에 `'pending'` 추가 (`STATUS_MAP` 은 이미 `pending → 'PENDING'`(접수대기) 이라 수정 불필요)
2. 신규주문 알림톡 발송 조건(`shop-order-sync.ts:327`)에도 `pending` 추가 — 안 하면 새 주문 알림이 안 나감
3. 세금계산서 발행 조건(`paid` 이상)·수불원장 기록 시점(`LEDGER_ACTIVE`)은 **그대로 유지**
4. (검토) `STATUS_MAP` 의 `cancelled: 'PENDING'` 을 `'CANCELLED'` 로 되돌릴지 — 자동취소 폐지로 전제가 사라짐

**쿠보몰 측 변경 (적용 완료)**: 6시간 미입금 자동취소 폐지 (`cleanupExpiredOrdersAction` 삭제,
`expiresAt` 기록 중단, `status+expiresAt` 인덱스 제거). `pending` 의 의미가 "결제 대기" → **"주문 접수"** 로 바뀜.
웹훅 시그니처는 변경 없음.

## A2. (from cuboerp) — 2026-08-11 확인 결과

ERP 커밋 `1562936` 에서 **이미 반영 완료**. `MIRRORABLE_STATUSES` 에 `pending` 추가,
`cancelled → CANCELLED` 되돌림. Q2 는 종결.

---

## Q3. [2026-08-11] 상태 전환 시 ERP webhook 미호출 — 수정 완료 (from cubo-shop)

ERP 세션이 먼저 지적(`cuboerp_요청_주문생성시_webhook_호출_20260811.md`), 그 지적이 정확했음.
전문은 브리지 폴더의 `회신3_webhook_호출지점_보강_20260811.md` 참고.

**원인**: `adminUpdateOrderAction` 의 webhook 호출 조건이 `shipped` 전환에만 걸려 있었음.
관리자가 주문 상세(`/admin/orders/{id}`) 상태 드롭다운에서 `paid` 로 바꿔도 ERP 에 신호가
안 나가, 매번 ERP 에서 수동 동기화를 눌러야 했음.

**조치 (적용 완료)**:
- 상태가 바뀌면 종류를 가리지 않고 호출 — `payment-confirm` / `shipped` / `status-changed`
- 고객 취소(`cancelOrderInternal`)에도 호출 추가 — 없으면 ERP 접수대기 ↔ 쿠보몰 재고복원이 어긋남
- 송장만 수정한 경우는 status 변동이 없어 호출 안 함 (종전과 동일)

**ERP 판단 필요 (회신 대기)**:
1. `isExpired()` 유지 여부 — 쿠보몰이 `expiresAt` 기록을 중단해 신규 주문엔 필드가 없음
2. 신규주문 알림톡을 `pending` 에도 보낼지 — 지금은 `paid` 이상이라 입금확인 전엔 안 나감
3. `ERP_SYNC_SECRET`(쿠보몰) ↔ `CRON_SECRET`(ERP) 값 일치 여부 — 불일치면 401 로 전부 무용지물
4. 잔존 만료주문 `aevbsnERSHtF2PyBmRYe` 처리 방향
