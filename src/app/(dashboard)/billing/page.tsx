import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BillingContent } from "@/components/billing/billing-content";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ユーザーのプラン取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData } = await (supabase.from("users") as any)
    .select("plan")
    .eq("id", user.id)
    .single() as { data: Pick<UserRow, "plan"> | null };

  // サブスクリプション情報取得（存在しない場合もある）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscription } = await (supabase.from("subscriptions") as any)
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .single() as { data: Pick<SubscriptionRow, "status" | "current_period_end"> | null };

  const initialPlan = userData?.plan ?? "free";

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      }
    >
      <BillingContent
        initialPlan={initialPlan}
        initialSubscription={subscription}
      />
    </Suspense>
  );
}
