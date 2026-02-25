import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlanType } from "@/types/index";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanCardProps {
  plan: PlanType;
  currentPlan: PlanType;
  price: string;
  description: string;
  features: PlanFeature[];
  children?: React.ReactNode;
}

const FREE_FEATURES: PlanFeature[] = [
  { text: "1プロジェクト", included: true },
  { text: "10件のテスティモニアル / プロジェクト", included: true },
  { text: "Wall of Loveウィジェット", included: true },
  { text: "Powered by Koe バッジあり", included: true },
  { text: "プロジェクト無制限", included: false },
  { text: "テスティモニアル無制限", included: false },
  { text: "全ウィジェットタイプ", included: false },
  { text: "カスタムブランドカラー", included: false },
];

const PRO_FEATURES: PlanFeature[] = [
  { text: "プロジェクト無制限", included: true },
  { text: "テスティモニアル無制限", included: true },
  { text: "全ウィジェットタイプ", included: true },
  { text: "カスタムブランドカラー", included: true },
  { text: "Powered by Koe バッジ非表示", included: true },
];

export function PlanCard({ plan, currentPlan, price, description, features, children }: PlanCardProps) {
  const isPro = plan === "pro";
  const isCurrent = plan === currentPlan;

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isPro && "border-primary shadow-md",
        isCurrent && "ring-2 ring-primary ring-offset-2"
      )}
      data-testid={`plan-card-${plan}`}
    >
      {isCurrent && (
        <Badge
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3"
          data-testid="current-plan-badge"
        >
          現在のプラン
        </Badge>
      )}
      {isPro && !isCurrent && (
        <Badge
          variant="secondary"
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3"
        >
          おすすめ
        </Badge>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-xl" data-testid="plan-name">
          {isPro ? "Pro" : "Free"}
        </CardTitle>
        <div className="mt-2" data-testid="plan-price">
          <span className="text-3xl font-bold">{price}</span>
          {isPro && <span className="text-sm text-muted-foreground ml-1">/ 月</span>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        <ul className="space-y-2.5" role="list" aria-label={`${isPro ? "Pro" : "Free"}プランの機能`}>
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              {feature.included ? (
                <Check
                  className="w-4 h-4 text-green-500 shrink-0 mt-0.5"
                  aria-label="含まれる"
                />
              ) : (
                <X
                  className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"
                  aria-label="含まれない"
                />
              )}
              <span className={cn(!feature.included && "text-muted-foreground")}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
        {children && <div className="mt-auto pt-2">{children}</div>}
      </CardContent>
    </Card>
  );
}

export { FREE_FEATURES, PRO_FEATURES };
