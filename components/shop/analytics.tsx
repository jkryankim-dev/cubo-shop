// =====================================================================
// 광고/방문 트래킹 — GA4 + 네이버 프리미엄 로그분석
//
// 환경변수가 비어있으면 script 자체 추가 안 함 (no-op).
// 운영 시작 시 사용자가 가입 후 ID 채우면 자동 활성화.
// =====================================================================

import Script from "next/script";

export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const naverId = process.env.NEXT_PUBLIC_NAVER_TRACKING_ID;

  return (
    <>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: true });`}
          </Script>
        </>
      )}

      {naverId && (
        <Script id="naver-wcs" strategy="afterInteractive">
          {`if (!wcs_add) var wcs_add = {};
wcs_add["wa"] = "${naverId}";
if (window.wcs) {
  wcs.inflow();
  wcs_do();
}`}
        </Script>
      )}
      {naverId && (
        <Script
          src="//wcs.naver.net/wcslog.js"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
