"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Boxes,
  CreditCard,
  ListChecks,
  ShoppingBag,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminStats,
  listRecentOrders,
  type AdminStats,
} from "@/lib/admin";
import { formatPriceKRW } from "@/lib/format";
import type { ShopOrder } from "@/types";

const STATUS_LABEL: Record<ShopOrder["status"], string> = {
  pending: "주문 접수",
  paid: "결제 완료",
  preparing: "배송 준비",
  shipped: "배송 중",
  delivered: "배송 완료",
  cancelled: "취소",
  refunded: "환불",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recent, setRecent] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminStats(), listRecentOrders(5)])
      .then(([s, r]) => {
        if (cancelled) return;
        setStats(s);
        setRecent(r);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        쇼핑몰 운영 한눈에 보기.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<ShoppingBag className="size-4" />}
          label="총 주문"
          value={stats?.totalOrders ?? 0}
          loading={loading}
          accent="brand-pink"
          subtext={
            stats?.pendingOrders
              ? `처리 대기 ${stats.pendingOrders}건`
              : "처리 대기 없음"
          }
        />
        <StatCard
          icon={<CreditCard className="size-4" />}
          label="누적 매출"
          value={
            stats ? formatPriceKRW(stats.totalRevenue) : "—"
          }
          loading={loading}
          accent="brand-mint"
          isString
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="회원 수"
          value={stats?.totalCustomers ?? 0}
          loading={loading}
          subtext={
            stats
              ? `사업자 ${stats.businessCustomers}명`
              : undefined
          }
        />
        <StatCard
          icon={<ListChecks className="size-4" />}
          label="검토 대기"
          value={stats?.pendingLicenseReviews ?? 0}
          loading={loading}
          subtext="사업자등록증"
          accent={
            stats?.pendingLicenseReviews ? "destructive" : undefined
          }
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">최근 주문</CardTitle>
            <Link
              href="/admin/orders"
              className="text-xs text-brand-pink hover:underline"
            >
              전체 보기 →
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                아직 주문이 없습니다. 결제 PG 연동 후 자동으로 채워집니다.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex items-center justify-between py-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">#{o.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.items.length}개 상품 · {STATUS_LABEL[o.status]}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {formatPriceKRW(o.totalAmount)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">바로가기</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickLink
              href="/admin/listings"
              icon={<Boxes className="size-4" />}
              label="상품 노출 관리"
            />
            <QuickLink
              href="/admin/customers"
              icon={<ListChecks className="size-4" />}
              label="사업자 회원 검토"
              badge={stats?.pendingLicenseReviews}
            />
            <QuickLink
              href="/admin/orders"
              icon={<ShoppingBag className="size-4" />}
              label="주문 관리"
              badge={stats?.pendingOrders}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  loading,
  accent,
  isString,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  loading: boolean;
  accent?: "brand-pink" | "brand-mint" | "destructive";
  isString?: boolean;
}) {
  const accentClass =
    accent === "brand-pink"
      ? "text-brand-pink"
      : accent === "brand-mint"
        ? "text-brand-mint"
        : accent === "destructive"
          ? "text-destructive"
          : "text-foreground";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`mt-2 text-2xl font-bold tracking-tight ${accentClass}`}>
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : isString ? (
            value
          ) : (
            (value as number).toLocaleString("ko-KR")
          )}
        </div>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {badge ? (
        <span className="rounded-full bg-brand-pink px-2 py-0.5 text-xs font-bold text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
