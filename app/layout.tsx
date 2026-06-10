import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@/components/shop/analytics";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ConsentModal } from "@/components/auth/consent-modal";
import { SalesRefBootstrap } from "@/components/sales-ref-bootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const FALLBACK_SITE_URL = "https://cubomall.kr";

function resolveSiteUrl(): URL {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL).trim();
  try {
    return new URL(raw);
  } catch {
    // 환경변수가 잘못된 형식 (https:// 누락 등) 이면 fallback 으로 대체.
    // 이 안전망 없으면 root layout 의 metadataBase 가 throw → 전 페이지 SSR 깨짐.
    return new URL(FALLBACK_SITE_URL);
  }
}

const SITE_URL_OBJ = resolveSiteUrl();
const SITE_URL = SITE_URL_OBJ.origin;

export const metadata: Metadata = {
  metadataBase: SITE_URL_OBJ,
  title: {
    default: "CUBO Shop — 피규어, 가방, 봉제인형 등 온라인 도매몰",
    template: "%s | CUBO Shop",
  },
  description:
    "피규어, 가방, 봉제인형 등 인형뽑기 매장에 필요한 인기 캐릭터 상품을 도매가로 공급합니다. 사업자 회원 도매 단가 자동 적용.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "CUBO Shop",
    title: "CUBO Shop — 피규어, 가방, 봉제인형 등 온라인 도매몰",
    description:
      "피규어, 가방, 봉제인형 등 인형뽑기 매장에 필요한 인기 캐릭터 상품을 도매가로.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CUBO Shop — 피규어, 가방, 봉제인형 등 온라인 도매몰",
    description:
      "피규어, 가방, 봉제인형 등 인형뽑기 매장에 필요한 인기 캐릭터 상품을 도매가로.",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Analytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Suspense fallback={null}>
              <SalesRefBootstrap />
            </Suspense>
            {children}
            <ConsentModal />
          </AuthProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
