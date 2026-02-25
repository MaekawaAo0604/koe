"use client";

import { useActionState } from "react";
import { signUpWithEmail } from "@/app/(auth)/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const [state, action, isPending] = useActionState(signUpWithEmail, {
    error: null,
    success: false,
  });

  if (state.success) {
    return (
      <div className="space-y-3 text-center py-4">
        <p className="text-sm font-medium text-green-700">
          確認メールを送信しました
        </p>
        <p className="text-sm text-muted-foreground">
          ご登録のメールアドレスに確認メールをお送りしました。
          メール内のリンクをクリックして登録を完了してください。
        </p>
        <p className="text-sm text-muted-foreground">
          メールが届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">お名前</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="山田 太郎"
          required
          autoComplete="name"
        />
      </div>
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
      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="8文字以上"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "登録中..." : "無料で始める"}
      </Button>
    </form>
  );
}
