import { FREE_PLAN_TESTIMONIAL_LIMIT } from "@/lib/plan";
import { cn } from "@/lib/utils";
import type { PlanType } from "@/types/index";

interface UsageIndicatorProps {
  current: number;
  plan: PlanType;
}

export function UsageIndicator({ current, plan }: UsageIndicatorProps) {
  if (plan !== "free") return null;

  const limit = FREE_PLAN_TESTIMONIAL_LIMIT;
  const isAtLimit = current >= limit;
  const isNearLimit = current >= limit * 0.8;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
        isAtLimit
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : isNearLimit
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-muted-foreground/20 bg-muted text-muted-foreground"
      )}
      data-testid="usage-indicator"
    >
      <span className="font-semibold" data-testid="usage-count">
        {current} / {limit} 件
      </span>
      {isAtLimit && (
        <span>
          上限に達しました。Proプランにアップグレードするとさらに収集できます。
        </span>
      )}
      {!isAtLimit && isNearLimit && (
        <span>まもなく上限に達します。</span>
      )}
    </div>
  );
}
