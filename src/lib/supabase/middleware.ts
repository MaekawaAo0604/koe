import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Supabase のセッションを更新するヘルパー関数。
 * すべてのリクエストで呼び出し、access_token のリフレッシュを行う（要件1 AC-9）。
 *
 * 重要: getSession() ではなく getUser() を使用する。
 * getSession() は JWT をサーバーサイドで検証しないため、セキュリティ上のリスクがある。
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          // リクエストの Cookie を更新
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // レスポンスを再生成してから Cookie を設定
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() を呼ぶことで access_token のリフレッシュが自動的にトリガーされる
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabaseResponse };
}
