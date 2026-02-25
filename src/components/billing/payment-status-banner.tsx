import { AlertTriangle } from "lucide-react";
import type { SubscriptionStatus } from "@/types/index";

interface PaymentStatusBannerProps {
  status: SubscriptionStatus;
}

export function PaymentStatusBanner({ status }: PaymentStatusBannerProps) {
  if (status !== "past_due") return null;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
      role="alert"
      data-testid="payment-status-banner"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="font-semibold">お支払いに問題が発生しています</p>
        <p className="mt-1 text-destructive/80">
          最新の請求書のお支払いができませんでした。プランの管理画面から支払い方法を更新してください。
        </p>
      </div>
    </div>
  );
}
