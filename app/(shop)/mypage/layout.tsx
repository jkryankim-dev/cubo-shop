"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RequireAuth } from "@/components/auth/require-auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/mypage", label: "내 정보" },
  { href: "/mypage/orders", label: "주문 내역" },
  { href: "/mypage/business-license", label: "사업자등록증" },
  { href: "/mypage/addresses", label: "배송지" },
  { href: "/mypage/password", label: "비밀번호 변경" },
  { href: "/mypage/withdraw", label: "회원 탈퇴" },
];

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <RequireAuth>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">마이페이지</h1>
        <div className="mt-8 grid gap-8 md:grid-cols-[200px_1fr]">
          <aside>
            <nav className="flex md:flex-col gap-1 overflow-x-auto">
              {NAV.map((item) => {
                const active =
                  item.href === "/mypage"
                    ? pathname === "/mypage"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section>{children}</section>
        </div>
      </div>
    </RequireAuth>
  );
}
