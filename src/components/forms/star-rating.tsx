"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  error?: string;
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-9 h-9",
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  error,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div>
      <div
        className="flex gap-1"
        role={readonly ? "img" : "group"}
        aria-label={readonly ? `${value}星` : "★評価を選択してください"}
      >
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            className={cn(
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-transform",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default"
            )}
            aria-label={`${star}星`}
            aria-pressed={!readonly ? value === star : undefined}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
