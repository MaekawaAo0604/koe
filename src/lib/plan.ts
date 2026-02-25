import { createClient } from "@/lib/supabase/server";
import type { PlanType } from "@/types/database";

/** Freeプランのテスティモニアル件数上限 */
export const FREE_PLAN_TESTIMONIAL_LIMIT = 10;

/** Freeプランのプロジェクト数上限 */
export const FREE_PLAN_PROJECT_LIMIT = 1;

/**
 * ユーザーのプランを取得する。
 * Server Component / Route Handler から呼び出す想定。
 *
 * @param userId - Supabase Auth の user.id
 * @returns 'free' | 'pro'。ユーザーが見つからない場合は 'free' を返す
 */
export async function getUserPlan(userId: string): Promise<PlanType> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  return (data as { plan: PlanType } | null)?.plan ?? "free";
}

/**
 * Proプランかどうかを判定する。
 */
export function isPro(plan: PlanType): boolean {
  return plan === "pro";
}

/**
 * プランに応じたテスティモニアル件数上限を返す。
 * Proプランは無制限（Infinity）。
 */
export function getTestimonialLimit(plan: PlanType): number {
  return plan === "pro" ? Infinity : FREE_PLAN_TESTIMONIAL_LIMIT;
}

/**
 * プランに応じたプロジェクト数上限を返す。
 * Proプランは無制限（Infinity）。
 */
export function getProjectLimit(plan: PlanType): number {
  return plan === "pro" ? Infinity : FREE_PLAN_PROJECT_LIMIT;
}

/**
 * 現在の件数が上限に達しているかを判定する。
 */
export function isAtLimit(current: number, limit: number): boolean {
  return current >= limit;
}
