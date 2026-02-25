"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface ForgotPasswordFormState {
  error: string | null;
  success: boolean;
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");

  const email = formData.get("email") as string;

  if (!email) {
    return { error: "メールアドレスを入力してください", success: false };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // セキュリティ上、エラーの有無に関わらず成功メッセージを返す
  if (error) {
    console.error("Password reset error:", error.message);
  }

  return { error: null, success: true };
}
