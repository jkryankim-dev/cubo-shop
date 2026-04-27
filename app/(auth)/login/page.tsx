import type { Metadata } from "next";
import LoginPageInner from "./login-form";

export const metadata: Metadata = {
  title: "로그인",
  description: "CUBO Shop 도매 회원 로그인.",
};

export default function LoginPage() {
  return <LoginPageInner />;
}
