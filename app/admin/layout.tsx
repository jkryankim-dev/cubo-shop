"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Boxes,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  ShoppingBag,
  Tag,
  UserCog,
} from "lucide-react";

import { RequireAuth } from "@/components/auth/require-auth";
import { Button } from "@/components/ui/button";
import { CuboLogo } from "@/components/shop/logo";
import { useAuth } from "@/components/auth/auth-provider";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "운영",
    items: [
      { href: "/admin", label: "대시보드", icon: LayoutDashboard },
      { href: "/admin/orders", label: "주문 관리", icon: ShoppingBag },
      { href: "/admin/payments", label: "결제 관리", icon: CreditCard },
    ],
  },
  {
    title: "상품",
    items: [
      { href: "/admin/listings", label: "상품 노출 관리", icon: Boxes },
      { href: "/admin/products-status", label: "ON 태그 현황", icon: Tag },
    ],
  },
  {
    title: "회원",
    items: [
      { href: "/admin/customers", label: "사업자 회원 검토", icon: ListChecks },
    ],
  },
  {
    title: "기타",
    items: [
      { href: "/admin/notifications", label: "알림톡 발송", icon: Bell },
      { href: "/admin/admins", label: "관리자 관리", icon: UserCog },
      { href: "/admin/settings", label: "사이트 설정", icon: Settings },
    ],
  },
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
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <Link
              href="/admin"
              aria-label="CUBO Admin"
              className="flex items-center gap-2"
            >
              <CuboLogo color="bg-background" className="h-6 w-12" />
              <span className="text-xs font-medium tracking-wider opacity-70">
                ADMIN
              </span>
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <span className="opacity-70">{profile?.name ?? "관리자"}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-background/15 hover:text-background"
                onClick={() => signOut()}
              >
                <LogOut className="mr-1.5 size-4" />
                로그아웃
              </Button>
              <Link
                href="/"
                className="text-xs opacity-80 hover:opacity-100"
              >
                쇼핑몰로
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/30 md:block">
            <nav className="space-y-6 p-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active =
                        item.href === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                              active
                                ? "bg-foreground text-background"
                                : "text-foreground/80 hover:bg-accent/40",
                            )}
                          >
                            <Icon className="size-4 shrink-0" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 flex-1 bg-background">
            <MobileNav pathname={pathname} />
            {children}
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const flat = NAV_GROUPS.flatMap((g) => g.items);
  return (
    <div className="border-b border-border bg-muted/30 md:hidden">
      <div className="flex gap-1 overflow-x-auto px-3 py-2">
        {flat.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:bg-accent/40",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
