import type { Metadata } from "next";
import ProductsView from "./products-view";

export const metadata: Metadata = {
  title: "전체 상품",
  description:
    "피규어, 가방, 봉제인형 등 인형뽑기 매장에 필요한 인기 상품을 도매가로 만나보세요.",
};

export default function ProductsPage() {
  return <ProductsView />;
}
