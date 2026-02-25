"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface ResetPasswordFormState {
  error: string | null;
}

export async function updatePassword(
  _prevState: ResetPasswordFormState,
  formData: FormData
): Promise<ResetPasswordFormState> {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "すべての項目を入力してください" };
  }

  if (password !== confirmPassword) {
    return { error: "パスワードが一致しません" };
  }

  if (password.length < 8) {
    return { error: "パスワードは8文字以上で入力してください" };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "パスワードの更新に失敗しました。もう一度お試しください。" };
  }

  redirect("/dashboard");
}
