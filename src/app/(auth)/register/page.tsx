import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "新規登録",
  description: "Koeに無料登録して、テスティモニアルの収集・管理を始めましょう。クレジットカード不要。",
};
import { OAuthButton } from "@/components/auth/oauth-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signUpWithGoogle } from "./actions";

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>アカウント作成</CardTitle>
        <CardDescription>
          必要事項を入力して無料アカウントを作成してください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OAuthButton provider="google" formAction={signUpWithGoogle} />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">または</span>
          </div>
        </div>
        <RegisterForm />
        <div className="text-center text-sm text-muted-foreground">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-primary hover:underline">
            ログイン
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
