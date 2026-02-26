import Stripe from "stripe";

/**
 * Stripe クライアントシングルトン。
 * サーバーサイドでのみ使用する。
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});
