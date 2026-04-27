// =====================================================================
// 장바구니 — localStorage 기반 (게스트도 사용 가능)
// 로그인 시 Firestore `shop_carts/{uid}` 와 동기화는 추후 단계.
// =====================================================================

import type { ShopCartItem } from "@/types";

const STORAGE_KEY = "cubo_shop_cart_v1";

export function getCartItems(): ShopCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it): it is ShopCartItem =>
        typeof it === "object" &&
        it !== null &&
        typeof (it as ShopCartItem).productId === "string" &&
        typeof (it as ShopCartItem).quantity === "number",
    );
  } catch {
    return [];
  }
}

export function saveCartItems(items: ShopCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cubo-cart-changed"));
}

export function addToCart(productId: string, quantity = 1) {
  const items = getCartItems();
  const idx = items.findIndex((it) => it.productId === productId);
  if (idx >= 0) {
    items[idx].quantity += quantity;
  } else {
    items.push({ productId, quantity });
  }
  saveCartItems(items);
}

export function updateCartQuantity(productId: string, quantity: number) {
  const items = getCartItems();
  const idx = items.findIndex((it) => it.productId === productId);
  if (idx < 0) return;
  if (quantity <= 0) {
    items.splice(idx, 1);
  } else {
    items[idx].quantity = quantity;
  }
  saveCartItems(items);
}

export function removeFromCart(productId: string) {
  const items = getCartItems().filter((it) => it.productId !== productId);
  saveCartItems(items);
}

export function clearCart() {
  saveCartItems([]);
}
