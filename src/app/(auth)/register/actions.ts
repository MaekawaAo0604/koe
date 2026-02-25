"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export interface SignUpFormState {
  error: string | null;
  success: boolean;
}

export async function signUpWithEmail(
  _prevState: SignUpFormState,
  formData: FormData
): Promise<SignUpFormState> {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !name) {
    return { error: "すべての項目を入力してください", success: false };
  }

  if (password.length < 8) {
    return { error: "パスワードは8文字以上で入力してください", success: false };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { name },
    },
  });

  if (error) {
    // ユーザーが既に存在する場合もセキュリティ上「メールを送信しました」と返す
    if (error.message.includes("already registered") || error.message.includes("User already registered")) {
      return { error: null, success: true };
    }
    return { error: "登録に失敗しました。もう一度お試しください。", success: false };
  }

  return { error: null, success: true };
}

export async function signUpWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect("/register?error=oauth_error");
  }

  if (data.url) {
    redirect(data.url);
  }
}
