"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, LogOut, Menu, ShoppingCart, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CuboLogo } from "@/components/shop/logo";
import { ThemeToggle } from "@/components/shop/theme-toggle";
import { useAuth } from "@/components/auth/auth-provider";
import { signOut } from "@/lib/auth";
import { getCartItems } from "@/lib/cart";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/products", label: "상품" },
  { href: "/cart", label: "장바구니" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { user, profile, admin, loading } = useAuth();

  useEffect(() => {
    const update = () => {
      const total = getCartItems().reduce((sum, it) => sum + it.quantity, 0);
      setCartCount(total);
    };
    update();
    window.addEventListener("cubo-cart-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cubo-cart-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="CUBO Shop 홈으로">
          <CuboLogo />
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-brand-pink"
            >
              {item.label}
            </Link>
          ))}
          {admin && (
            <Link
              href="/admin"
              className="text-sm font-medium text-brand-pink hover:underline"
            >
              관리자
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <ThemeToggle />
          <Link href="/cart" className="relative" aria-label="장바구니">
            <Button variant="ghost" size="icon">
              <ShoppingCart />
            </Button>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-pink px-1 text-xs font-bold leading-none text-primary-foreground">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {!loading && user ? (
            <div className="hidden md:flex md:items-center md:gap-2">
              <Link href="/mypage">
                <Button variant="ghost" size="sm">
                  <User className="mr-1.5" />
                  {profile?.name ?? "마이페이지"}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                aria-label="로그아웃"
              >
                <LogOut />
              </Button>
            </div>
          ) : !loading ? (
            <div className="hidden md:flex md:items-center md:gap-1">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  로그인
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">회원가입</Button>
              </Link>
            </div>
          ) : null}

          <Link href="/mypage" className="md:hidden" aria-label="마이페이지">
            <Button variant="ghost" size="icon">
              {user ? <User /> : <LogIn />}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="메뉴 열기"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "md:hidden border-t border-border bg-background",
          mobileOpen ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {admin && (
            <Link
              href="/admin"
              className="rounded-md px-3 py-3 text-base font-medium text-brand-pink"
              onClick={() => setMobileOpen(false)}
            >
              관리자
            </Link>
          )}
          {!user && (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-3 text-base font-medium"
                onClick={() => setMobileOpen(false)}
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="rounded-md px-3 py-3 text-base font-medium text-brand-pink"
                onClick={() => setMobileOpen(false)}
              >
                회원가입
              </Link>
            </>
          )}
          {user && (
            <button
              type="button"
              className="rounded-md px-3 py-3 text-left text-base font-medium text-destructive"
              onClick={() => {
                setMobileOpen(false);
                signOut();
              }}
            >
              로그아웃
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
