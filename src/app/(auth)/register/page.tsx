import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
