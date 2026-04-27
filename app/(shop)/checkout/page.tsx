import type { Metadata } from "next";
import CheckoutView from "./checkout-view";

export const metadata: Metadata = {
  title: "결제",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
