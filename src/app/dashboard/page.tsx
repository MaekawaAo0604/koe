import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // supabase-js v2.47+ の PostgREST v12 型推論の互換性のため型アサーションを使用
  const { data: profile } = (await supabase
    .from("users")
    .select("*")
    .eq("id", user!.id)
    .single()) as unknown as { data: UserRow | null; error: unknown };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">ダッシュボード</h1>
            <p className="text-muted-foreground mt-1">
              ようこそ、{profile?.name || user?.email}さん
            </p>
          </div>
          <SignOutButton />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">アカウント情報</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">メールアドレス:</dt>
              <dd>{user?.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">プラン:</dt>
              <dd className="capitalize">{profile?.plan ?? "free"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
