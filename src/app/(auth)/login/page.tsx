import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ログイン",
  description: "Koeにログインして、テスティモニアルの収集・管理を開始しましょう。",
  robots: { index: false },
};
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButton } from "@/components/auth/oauth-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithGoogle } from "./actions";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ログイン</CardTitle>
        <CardDescription>
          メールアドレスとパスワードでログインしてください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OAuthButton provider="google" formAction={signInWithGoogle} />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">または</span>
          </div>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <div className="text-center text-sm space-y-2">
          <div>
            <Link href="/forgot-password" className="text-primary hover:underline">
              パスワードをお忘れですか？
            </Link>
          </div>
          <div className="text-muted-foreground">
            アカウントをお持ちでない方は{" "}
            <Link href="/register" className="text-primary hover:underline">
              新規登録
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
