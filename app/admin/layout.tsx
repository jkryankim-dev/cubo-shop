"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RequireAuth } from "@/components/auth/require-auth";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/listings", label: "상품 노출 관리" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  const pathname = usePathname();

  return (
    <RequireAuth adminOnly>
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-border bg-foreground text-background">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-sm font-bold tracking-wide">
                CUBO Admin
              </Link>
              <nav className="flex gap-1">
                {NAV.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-background/15 font-medium"
                          : "opacity-80 hover:opacity-100",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="opacity-70">{profile?.name ?? "관리자"}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-background/15 hover:text-background"
                onClick={() => signOut()}
              >
                로그아웃
              </Button>
              <Link href="/" className="opacity-80 hover:opacity-100">
                쇼핑몰로
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 bg-muted/30">{children}</main>
      </div>
    </RequireAuth>
  );
}
