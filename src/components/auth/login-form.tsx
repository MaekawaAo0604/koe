"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithEmail } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";

  const [state, action, isPending] = useActionState(signInWithEmail, {
    error: null,
  });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
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
          placeholder="パスワードを入力"
          required
          autoComplete="current-password"
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "ログイン中..." : "ログイン"}
      </Button>
    </form>
  );
}
