"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { Heart, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ProductCard } from "@/components/shop/product-card";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import { addToCart } from "@/lib/cart";
import { formatPriceKRW } from "@/lib/format";
import { getSafetyStockOf } from "@/lib/safety-stocks";
import {
  getBundleUnit,
  getDisplayPrice,
  isShoppableProduct,
  isSoldOut,
} from "@/lib/visibility";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile, approvedBusiness, loading: authLoading } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | undefined>(undefined);
  const [related, setRelated] = useState<Product[]>([]);

  // 메인 상품 로드
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        setLoading(false);
        return;
      }
      try {
        const [snap, safetyStock] = await Promise.all([
          getDoc(doc(db, "products", id)),
          getSafetyStockOf(id),
        ]);
        if (cancelled) return;
        if (!snap.exists()) {
          notFound();
          return;
        }
        const data = {
          id: snap.id,
          ...snap.data(),
          safetyStock,
        } as Product;
        if (!isShoppableProduct(data)) {
          notFound();
          return;
        }
        setProduct(data);
        setActiveImage(data.imageUrl);
        setQuantity(getBundleUnit(data));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "상품 로드 실패");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 같은 카테고리 추천 상품 로드
  useEffect(() => {
    if (!product?.category) return;
    let cancelled = false;
    async function loadRelated() {
      try {
        if (!product) return;
        const snap = await getDocs(collection(db, "products"));
        if (cancelled) return;
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter(
            (p) =>
              p.id !== product.id &&
              p.category === product.category &&
              isShoppableProduct(p),
          )
          .slice(0, 8);
        setRelated(list.slice(0, 4));
      } catch (err) {
        console.warn("[product-detail] related load fail", err);
      }
    }
    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [product]);

  const galleryImages = useMemo(() => {
    if (!product) return [] as string[];
    const arr: string[] = [];
    if (product.imageUrl) arr.push(product.imageUrl);
    return arr;
  }, [product]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-base font-medium">
          {error ?? "상품을 찾을 수 없습니다."}
        </p>
      </div>
    );
  }

  const hasDetail = Boolean(product.detailImageUrl || product.detailText);
  const soldOut = isSoldOut(product);
  const price = getDisplayPrice(product);
  const bundleUnit = getBundleUnit(product);
  const subTotal = price * quantity;

  function decreaseQty() {
    setQuantity((q) => Math.max(bundleUnit, q - bundleUnit));
  }
  function increaseQty() {
    setQuantity((q) => q + bundleUnit);
  }
  function handleAddToCart() {
    addToCart(product!.id, quantity);
    toast.success("장바구니에 담았어요.");
  }
  function handleInstantBuy() {
    if (soldOut) return;
    addToCart(product!.id, quantity);
    router.push("/checkout");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 상단 — 이미지 / 정보 */}
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
            {activeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImage}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                이미지 없음
              </div>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {galleryImages.map((url) => (
                <button
                  key={url}
                  type="button"
                  className={cn(
                    "aspect-square overflow-hidden rounded border-2 transition-colors",
                    activeImage === url
                      ? "border-brand-pink"
                      : "border-transparent hover:border-border",
                  )}
                  onClick={() => setActiveImage(url)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {product.category && (
            <Link
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-brand-pink"
            >
              {product.category}
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
              {product.name}
            </h1>
            {product.spec && (
              <p className="mt-2 text-sm text-muted-foreground">
                {product.spec}
              </p>
            )}
          </div>

          {!authLoading && approvedBusiness && (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-brand-pink">
                {formatPriceKRW(price)}
              </span>
              {product.priceA &&
                product.defaultPrice &&
                product.priceA < product.defaultPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPriceKRW(product.defaultPrice)}
                  </span>
                )}
            </div>
          )}

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags
                .filter((t) => !["ON", "FRANCHISE_ONLY", "NO_INVOICE"].includes(t))
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-brand-mint/30 px-2.5 py-0.5 text-xs font-semibold"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}

          <Separator />

          {!authLoading && !approvedBusiness ? (
            // 비로그인 + 일반/미승인 사업자 회원 모두 동일 처리:
            // 가격·수량·구매 UI 전부 숨기고 사업자 승인 안내 박스
            <div className="rounded-md border border-dashed border-brand-pink/40 bg-brand-pink/5 p-4 text-center">
              <p className="text-sm font-semibold">
                사업자 승인 회원 전용 도매가
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {!user
                  ? "가격 확인·구매는 사업자 회원 로그인 후 가능합니다."
                  : profile?.businessLicense?.status === "pending"
                    ? "사업자등록증 검토 중입니다. 승인되면 가격이 표시됩니다."
                    : profile?.businessLicense?.status === "rejected"
                      ? "사업자등록증이 반려되었습니다. 마이페이지에서 다시 업로드해주세요."
                      : "사업자등록증을 등록하시면 검토 후 가격이 표시됩니다."}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                {!user ? (
                  <>
                    <Link href="/login">
                      <Button size="sm" variant="outline">
                        로그인
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button size="sm">사업자 회원가입</Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/mypage/business-license">
                    <Button size="sm">사업자등록증 등록</Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    수량
                    {bundleUnit > 1 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({bundleUnit}개 단위로 구매)
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={decreaseQty}>
                      −
                    </Button>
                    <span className="min-w-10 text-center text-sm">{quantity}</span>
                    <Button variant="outline" size="sm" onClick={increaseQty}>
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex items-baseline justify-between rounded-md bg-muted/40 px-3 py-2">
                  <span className="text-sm text-muted-foreground">총 상품 금액</span>
                  <span className="text-xl font-bold text-brand-pink">
                    {formatPriceKRW(subTotal)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  disabled={soldOut}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-1.5 size-4" /> 장바구니
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={soldOut}
                  onClick={handleInstantBuy}
                >
                  바로 구매
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="찜"
                  className="size-11"
                  disabled
                >
                  <Heart />
                </Button>
              </div>
              {soldOut && (
                <p className="text-sm text-destructive">
                  현재 품절 — 재입고 알림은 추후 단계에서 추가 예정.
                </p>
              )}
            </>
          )}

          <Card className="border-brand-mint/40 bg-brand-mint/10">
            <CardContent className="flex items-center gap-3 p-4 text-sm">
              <Truck className="size-5 shrink-0 text-foreground/80" />
              <div>
                <p className="font-medium">전국 빠른 택배 배송</p>
                <p className="text-xs text-muted-foreground">
                  평일 오후 2시 이전 결제 확정 건은 당일 출고를 원칙으로 합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 상품 상세 — ERP 가 detailImageUrl/detailText 로 등록한 콘텐츠 */}
      <section className="mt-16">
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">상품 상세</h2>
          <span className="h-px flex-1 bg-border" />
        </div>
        {hasDetail ? (
          <div className="space-y-6">
            {product.detailImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.detailImageUrl}
                alt={`${product.name} 상세`}
                className="block w-full"
                loading="lazy"
              />
            )}
            {product.detailText && (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {product.detailText}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-12 text-center">
            <p className="text-sm font-medium">상세 콘텐츠 등록 예정</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ERP 에서 상세 이미지/설명을 등록하면 이 자리에 자동으로 표시됩니다.
            </p>
          </div>
        )}
      </section>

      {/* 상품 정보 표 */}
      <section className="mt-16">
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">상품 정보</h2>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Card>
          <CardContent className="p-0">
            <dl className="divide-y text-sm">
              <InfoRow label="상품명" value={product.name} />
              {product.spec && <InfoRow label="규격" value={product.spec} />}
              {product.category && (
                <InfoRow label="카테고리" value={product.category} />
              )}
              {product.barcode && (
                <InfoRow label="바코드" value={product.barcode} />
              )}
              {!authLoading && approvedBusiness && (
                <InfoRow
                  label="판매가"
                  value={formatPriceKRW(price)}
                />
              )}
              <InfoRow
                label="재고"
                value={
                  soldOut
                    ? "품절"
                    : `${(product.stock ?? 0).toLocaleString("ko-KR")}개`
                }
              />
              <InfoRow
                label="제조사·원산지"
                value="상품 등록 시 ERP 에서 입력"
              />
            </dl>
          </CardContent>
        </Card>
      </section>

      {/* 배송·교환·환불 */}
      <section className="mt-16">
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">배송 / 교환 / 환불</h2>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <PolicyCard
            title="배송 안내"
            items={[
              "전국 일반 택배 배송",
              "평일 오후 2시 이전 결제 확정 건 당일 출고",
              "도서·산간 추가 배송비 발생",
            ]}
          />
          <PolicyCard
            title="교환 안내"
            items={[
              "상품 수령 후 7일 이내",
              "단순 변심 시 왕복 배송비 고객 부담",
              "재고 소진 시 환불 처리",
            ]}
          />
          <PolicyCard
            title="환불 안내"
            items={[
              "회수 확인 후 영업일 기준 3일 이내 환불",
              "결제 수단별 환불 처리 기간 차이 있음",
              "사용·훼손 시 환불 제한",
            ]}
          />
        </div>
      </section>

      {/* 같은 카테고리 추천 */}
      {related.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">함께 보는 상품</h2>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center px-4 py-3">
      <dt className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="flex-1">{value}</dd>
    </div>
  );
}

function PolicyCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-semibold">{title}</p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {items.map((it) => (
            <li key={it} className="flex gap-1">
              <span className="text-brand-pink">·</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
