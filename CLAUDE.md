# CUBO Shop — 프로젝트 영구 메모리

## 프로젝트 개요
- B2C 한국 인터넷 쇼핑몰 (인형뽑기 매장용 굿즈 도매·소매)
- 호스팅: Netlify (도메인 별도 — 추후 연결)
- 자매 프로젝트: **cuboerp** (같은 오너의 ERP, 같은 Firebase 프로젝트 공유)

## 사용자 (오너) 프로필
- 코딩·인프라 초보자
- 항상 **쉬운 한국어** 로 설명
- 기술 용어는 첫 등장 시 괄호로 짧게 풀이
- 변경 제안 시: *무엇을 바꾸는지* 한 문장 → 명령
- 부작용 (운영 영향, 되돌리기 어려움) 선제적 안내
- **커밋·푸시 직전엔 항상 "Netlify 배포 태울지" 먼저 묻기**
  - 스킵이면 메시지에 `[skip netlify]` 포함 (예: `docs: README 수정 [skip netlify]`)

## 푸시 정책 — 개발 단계 (홈페이지 완성 전)

> ⚠️ **현재 상태: 개발 단계.** 홈페이지가 완성되기 전까지는 함부로 푸시하지 않는다.

규칙:
- **자동 푸시 금지** — 작업이 끝나도 임의로 `git push` 하지 말 것
- 푸시는 사용자가 **명시적으로 "푸시"·"커밋·푸시"·"올려"** 같은 단어로 요청한 경우에만 수행
- "이대로 진행해줘" / "다음 작업해줘" 같은 일반 진행 지시는 푸시 승인이 **아님**
- 코드 변경 / 로컬 빌드 검증 / 커밋까지는 가능하되, 푸시 전에 사용자에게 변경 요약을 보고하고 명시 승인 대기
- 사용자가 "이전처럼 푸시까지 알아서" 같은 명시적 일괄 승인을 다시 주면 그때부터 다시 자동 푸시 가능
- 홈페이지 정식 오픈 시점에 본 룰을 갱신할 것

## 기술 스택 (cuboerp 와 동일 — 학습 비용 0)
- **Next.js 16** (App Router, Webpack dev) — `next dev --webpack`
- **React 19**
- **TypeScript 5 strict**
- **Tailwind CSS v4** + **Shadcn/UI** (Radix Primitives)
- **Firebase 12** (Web SDK + Admin SDK)
- **pnpm** (Node 20+)
- **Sentry** 모니터링 (추후)
- **Netlify** 배포 (자동 빌드, 시크릿 스캐너 false-positive 대응 필요)

## 브랜드 컬러 (매장 컨셉 기반)
| 역할 | HEX | Tailwind 클래스 |
|---|---|---|
| Mint (매장 벽) | `#7FD9C7` | `bg-brand-mint` 또는 `bg-accent` |
| Pink (CUBO 로고색, primary) | `#E91E63` | `bg-brand-pink` 또는 `bg-primary` |
| Red (도어/창틀, destructive) | `#E63946` | `bg-brand-red` 또는 `bg-destructive` |

CSS 변수 정의 위치: `app/globals.css`

## DB 공유 원칙 — 절대 어기지 말 것

cuboerp 와 **동일한 Firebase 프로젝트** 를 공유합니다.

### ERP 소유 컬렉션 (cuboerp 가 관리)
| 컬렉션 | 권한 |
|---|---|
| `products` | **읽기만** (노출 조건: `isDeleted !== true && hidden !== true`, 일반 고객 단가는 `priceA`) |
| `products.stock` | 결제 확정 시 **서버 SDK 트랜잭션으로만** 차감 — 그 외 변경 금지 |
| `orders`, `users`, `entities` 등 기타 ERP 컬렉션 | **접근 금지** (코드에서 import 자체 만들지 말 것) |

> `priceB` / `priceC` / `priceCOST` 는 B2B 단가 — 쇼핑몰에서 무시.

### 쇼핑몰 전용 컬렉션 (모두 `shop_` 접두사)
| 컬렉션 | 용도 |
|---|---|
| `shop_customers/{uid}` | 일반 고객 회원 (Firebase Auth uid 기준) |
| `shop_orders/{orderId}` | 쇼핑몰 주문 (ERP `orders` 와 별개) |
| `shop_carts/{uid}` | 장바구니 (선택, localStorage 우선) |

쇼핑몰 `firestore.rules` 는 `shop_*` 컬렉션만 다룰 것 (ERP rules 와 충돌 X). ERP rules 는 cuboerp 세션에서 따로 갱신.

## 핵심 도메인 사항
- **결제 PG**: 포트원(PortOne) 또는 토스페이먼츠 SDK 연동 (한국 PG)
- **회원가입**: Firebase Auth (이메일 / 카카오·네이버 소셜은 추후)
- **배송**: 일반 택배 (로젠택배 등) — 송장번호 입력형
- **통화/언어**: 한국어 라벨, ₩ 통화, 천단위 콤마, 모바일 반응형 필수

## 법적 요건 (푸터 필수 표시)
- 사업자 정보: 사업자등록번호, 통신판매업번호, 대표자, 주소, 연락처, 메일
- 이용약관 페이지
- 개인정보처리방침 페이지

## 코드 컨벤션
- **TS strict** — `any` 도입 시 주석으로 사유 명시
- 클라이언트 컴포넌트 상단에 `"use client";`
- 한국어 라벨/메시지가 기본
- 커밋 메시지: 한국어 prefix `feat:` `fix:` `refactor:` `docs:` `chore:`

## 폴더 구조
```
app/
  (shop)/        — 일반 고객용 (홈, 상품목록, 상품상세, 장바구니, 결제, 마이페이지)
  (auth)/        — 로그인/회원가입
  api/           — 결제 콜백, 웹훅 등
components/
  shop/          — 상품 카드, 장바구니 등
  ui/            — shadcn 컴포넌트
lib/
  firebase.ts        — 클라이언트 SDK (Auth + Firestore, read-only 원칙)
  firebaseAdmin.ts   — 서버 SDK (Lazy init, 결제·웹훅용)
  utils.ts           — cn() 헬퍼
  portone.ts         — 결제 (또는 toss.ts)
types/index.ts       — Product, ShopOrder, ShopCustomer 등
```

## 절대 금지
- ERP 의 `firestore.rules` / `orders` / `users` / `entities` 컬렉션 직접 수정 또는 (읽기 외) 접근
- `.env*` 커밋 (`.env.local.example` 만 예외 — `.gitignore` 의 `!.env*.example` negation)
- 운영 데이터 함부로 변경 (테스트는 별도 컬렉션 prefix 등으로)

@AGENTS.md
