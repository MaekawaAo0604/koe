import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // プロフィールの存在を保証（トリガー失敗時のフォールバック）
  await ensureProfile(supabase, user.id);

  // supabase-js v2.47+ の PostgREST v12 型推論の互換性のため型アサーションを使用
  const { data: profile } = (await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single()) as unknown as { data: Pick<UserRow, "name"> | null; error: unknown };

  const userName = profile?.name || user.email!;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header userName={userName} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
          <footer className="mt-8 border-t pt-4 pb-2 text-center text-xs text-muted-foreground">
            <nav className="flex items-center justify-center gap-4">
              <Link href="/terms">利用規約</Link>
              <Link href="/privacy">プライバシーポリシー</Link>
              <Link href="/contact">お問い合わせ</Link>
            </nav>
          </footer>
        </main>
      </div>
    </div>
  );
}
