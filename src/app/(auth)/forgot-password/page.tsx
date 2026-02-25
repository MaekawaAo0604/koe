"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(requestPasswordReset, {
    error: null,
    success: false,
  });

  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>メールを送信しました</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            パスワードリセット用のメールを送信しました。メール内のリンクをクリックしてパスワードを再設定してください。
          </p>
          <p className="text-sm text-muted-foreground">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </p>
          <Link href="/login" className="block text-center text-sm text-primary hover:underline">
            ログインページへ戻る
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>パスワードリセット</CardTitle>
        <CardDescription>
          登録済みのメールアドレスを入力してください。パスワードリセット用のメールをお送りします。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "送信中..." : "リセットメールを送信"}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              ログインページへ戻る
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
