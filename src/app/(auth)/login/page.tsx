import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
        <LoginForm />
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
