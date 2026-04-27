import type { Metadata } from "next";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "회원가입",
  description: "CUBO Shop 도매 회원가입. 사업자등록증 등록 시 도매가가 적용됩니다.",
};

export default function SignupPage() {
  return <SignupForm />;
}
