import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

/**
 * ログイン後に public.users にプロフィールが存在することを保証する。
 * トリガーが何らかの理由で失敗した場合のフォールバック。
 */
export async function ensureProfile(
  supabase: ServerSupabaseClient,
  userId: string
) {
  // supabase-js v2.47+ の PostgREST v12 型推論の互換性のため型アサーションを使用
  const { data: profile } = (await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .single()) as unknown as { data: { id: string } | null; error: unknown };

  if (!profile) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const insertData: UserInsert = {
        id: user.id,
        email: user.email!,
        name:
          user.user_metadata?.name ??
          user.user_metadata?.full_name ??
          "",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      };
      // supabase-js v2.47+ の PostgREST v12 型推論の互換性のため型アサーションを使用
      await (supabase.from("users") as unknown as { insert: (data: UserInsert) => Promise<unknown> }).insert(insertData);
    }
  }
}
