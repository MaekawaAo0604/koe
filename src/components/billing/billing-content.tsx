"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PlanCard, FREE_FEATURES, PRO_FEATURES } from "@/components/billing/plan-card";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { PaymentStatusBanner } from "@/components/billing/payment-status-banner";
import { Button } from "@/components/ui/button";
import type { PlanType, SubscriptionStatus } from "@/types/index";

interface InitialSubscription {
  status: SubscriptionStatus;
  current_period_end: string;
}

interface BillingContentProps {
  initialPlan: PlanType;
  initialSubscription: InitialSubscription | null;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BillingContent({ initialPlan, initialSubscription }: BillingContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plan, setPlan] = useState<PlanType>(initialPlan);
  const [subscription, setSubscription] = useState<InitialSubscription | null>(initialSubscription);
  const [isPolling, setIsPolling] = useState(false);
  const [isManageLoading, setIsManageLoading] = useState(false);

  const isSuccess = searchParams.get("success") === "true";
  const isCanceled = searchParams.get("canceled") === "true";

  const fetchCurrentPlan = useCallback(async (): Promise<PlanType> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "free";

    const { data } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    return (data as { plan: PlanType } | null)?.plan ?? "free";
  }, []);

  // 決済成功後のポーリング（要件7 AC-3）
  useEffect(() => {
    if (!isSuccess) return;

    // URLから ?success=true を除去
    router.replace("/billing");
    setIsPolling(true);

    const interval = setInterval(async () => {
      const currentPlan = await fetchCurrentPlan();
      if (currentPlan === "pro") {
        setPlan("pro");
        setIsPolling(false);
        clearInterval(interval);
        toast.success("Proプランへのアップグレードが完了しました！");

        // サブスクリプション情報を再取得
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("status, current_period_end")
            .eq("user_id", user.id)
            .single();
          if (sub) setSubscription(sub as InitialSubscription);
        }
      }
    }, 2000);

    // 30秒でタイムアウト
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsPolling(false);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isSuccess, fetchCurrentPlan, router]);

  const handleManageSubscription = async () => {
    setIsManageLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "エラーが発生しました");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setIsManageLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">課金管理</h1>
        <p className="text-muted-foreground mt-1">プランの確認・変更を行います</p>
      </div>

      {/* past_due バナー（要件7 AC-13） */}
      {subscription?.status && (
        <PaymentStatusBanner status={subscription.status} />
      )}

      {/* キャンセルメッセージ */}
      {isCanceled && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700"
          role="status"
          data-testid="cancel-message"
        >
          決済がキャンセルされました。いつでもアップグレードできます。
        </div>
      )}

      {/* ポーリング中の「処理中...」表示（要件7 AC-3） */}
      {isPolling && (
        <div
          className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary"
          role="status"
          data-testid="polling-indicator"
        >
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          <p>決済を確認中です。しばらくお待ちください...</p>
        </div>
      )}

      {/* 現在のプラン情報（要件7 AC-12） */}
      {plan === "pro" && subscription && (
        <div
          className="rounded-lg border bg-card p-4 text-sm"
          data-testid="subscription-info"
        >
          <p className="font-medium">現在のプラン: Pro</p>
          <p className="text-muted-foreground mt-1">
            次回請求日:{" "}
            <span data-testid="next-billing-date">
              {formatDate(subscription.current_period_end)}
            </span>
          </p>
          {subscription.status === "canceled" && (
            <p className="text-amber-600 mt-1" data-testid="cancel-notice">
              ※ キャンセル済み。上記の日付まではProプランを利用できます。
            </p>
          )}
        </div>
      )}

      {/* プラン比較カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlanCard
          plan="free"
          currentPlan={plan}
          price="¥0"
          description="個人・小規模なテスティモニアル収集に"
          features={FREE_FEATURES}
        />
        <PlanCard
          plan="pro"
          currentPlan={plan}
          price="¥980"
          description="プロフェッショナルな活用に"
          features={PRO_FEATURES}
        >
          {plan === "free" ? (
            <UpgradeButton disabled={isPolling} />
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleManageSubscription}
              disabled={isManageLoading}
              data-testid="manage-button"
            >
              {isManageLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  処理中...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  プランを管理
                </>
              )}
            </Button>
          )}
        </PlanCard>
      </div>
    </div>
  );
}
