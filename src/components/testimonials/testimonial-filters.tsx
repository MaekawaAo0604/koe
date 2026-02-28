"use client";

import { Suspense, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusOption = "all" | "pending" | "approved" | "rejected";

interface TestimonialFiltersProps {
  availableTags: string[];
}

const STATUS_OPTIONS: { value: StatusOption; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "未審査" },
  { value: "approved", label: "承認済み" },
  { value: "rejected", label: "非承認" },
];

function TestimonialFiltersInner({ availableTags }: TestimonialFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentStatus = (searchParams.get("status") ?? "all") as StatusOption;
  const currentRating = searchParams.get("rating")
    ? Number(searchParams.get("rating"))
    : null;
  const currentTags =
    searchParams.get("tags")?.split(",").filter(Boolean) ?? [];

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, router, pathname]
  );

  function toggleTag(tag: string) {
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updateParam("tags", newTags.length > 0 ? newTags.join(",") : null);
  }

  function clearFilters() {
    router.push(pathname);
  }

  const hasActiveFilters =
    currentStatus !== "all" || currentRating !== null || currentTags.length > 0;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* ステータスフィルタ */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap w-20">
          ステータス
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={currentStatus === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updateParam(
                  "status",
                  opt.value === "all" ? null : opt.value
                )
              }
              className="h-7 text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ★評価フィルタ */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap w-20">
          ★ 評価
        </span>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={currentRating === null ? "default" : "outline"}
            size="sm"
            onClick={() => updateParam("rating", null)}
            className="h-7 text-xs"
          >
            すべて
          </Button>
          {[1, 2, 3, 4, 5].map((r) => (
            <Button
              key={r}
              variant={currentRating === r ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updateParam(
                  "rating",
                  currentRating === r ? null : String(r)
                )
              }
              className={cn(
                "h-7 text-xs flex items-center gap-1",
                currentRating === r && "text-primary-foreground"
              )}
              aria-label={`★${r}でフィルタ`}
            >
              <Star
                className={cn(
                  "w-3 h-3",
                  currentRating === r ? "fill-current" : "fill-amber-400 text-amber-400"
                )}
                aria-hidden="true"
              />
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* タグフィルタ */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap w-20">
            タグ
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {availableTags.map((tag) => (
              <Badge
                key={tag}
                variant={currentTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer select-none flex items-center gap-1 hover:opacity-80 transition-opacity"
                onClick={() => toggleTag(tag)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && toggleTag(tag)}
                aria-pressed={currentTags.includes(tag)}
              >
                {tag}
                {currentTags.includes(tag) && (
                  <X className="w-2.5 h-2.5" aria-hidden="true" />
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* フィルタリセット */}
      {hasActiveFilters && (
        <div className="pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs text-muted-foreground"
          >
            <X className="w-3 h-3 mr-1" aria-hidden="true" />
            フィルターをリセット
          </Button>
        </div>
      )}
    </div>
  );
}

// useSearchParams() を使うためSuspense boundaryでラップ（実装ルール8）
export function TestimonialFilters({ availableTags }: TestimonialFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="h-24 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
      }
    >
      <TestimonialFiltersInner availableTags={availableTags} />
    </Suspense>
  );
}
