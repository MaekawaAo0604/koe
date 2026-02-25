"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export interface SignInFormState {
  error: string | null;
}

export async function signInWithEmail(
  _prevState: SignInFormState,
  formData: FormData
): Promise<SignInFormState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string | null;

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください" };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes("email_not_confirmed") || error.message.includes("Email not confirmed")) {
      return { error: "メールアドレスの確認が完了していません。確認メールをご確認ください" };
    }
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  redirect(redirectTo ?? "/dashboard");
}

export async function signInWithGoogle() {
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
    redirect("/login?error=oauth_error");
  }

  if (data.url) {
    redirect(data.url);
  }
}
