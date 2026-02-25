import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "パスワード再設定",
  description: "新しいパスワードを設定して、アカウントへのアクセスを回復しましょう。",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
