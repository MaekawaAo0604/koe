import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "パスワードリセット",
  description: "登録済みのメールアドレスを入力して、パスワードリセットメールを受け取りましょう。",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
