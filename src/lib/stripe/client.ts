import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Stripe クライアントシングルトン。
 * サーバーサイドでのみ使用する。
 */
export const stripe = new Stripe(env("STRIPE_SECRET_KEY"), {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});
