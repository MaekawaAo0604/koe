import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSSのクラス名を結合するユーティリティ関数
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * URLスラッグとして有効かどうかを検証する
 * 小文字英数字とハイフンのみ（3〜50文字）
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
}

/**
 * 16進数カラーコードとして有効かどうかを検証する
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

/**
 * 日付文字列を日本語形式でフォーマットする
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * テスティモニアルの使用状況を計算する
 */
export function calculateUsagePercentage(current: number, limit: number): number {
  if (limit === 0) return 100;
  return Math.min(Math.round((current / limit) * 100), 100);
}
