"use client";

import { useActionState } from "react";
import { updatePassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(updatePassword, {
    error: null,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>新しいパスワードを設定</CardTitle>
        <CardDescription>
          新しいパスワードを入力してください（8文字以上）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">新しいパスワード</Label>
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="パスワードを再入力"
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
            {isPending ? "更新中..." : "パスワードを更新"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
