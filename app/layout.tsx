import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CUBO Shop — 피규어, 가방, 봉제인형 등 온라인 도매몰",
    template: "%s | CUBO Shop",
  },
  description:
    "피규어, 가방, 봉제인형 등 인형뽑기 매장에 필요한 인기 캐릭터 상품을 도매가로 공급합니다. 사업자 회원 도매 단가 자동 적용.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
