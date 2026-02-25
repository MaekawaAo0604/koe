import Stripe from "stripe";
import { stripe } from "./client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { SubscriptionStatus } from "@/types/database";

// Stripe の subscription.status → Koe 内部ステータスへのマッピング
const STRIPE_STATUS_MAP: Record<string, string> = {
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "past_due",
  incomplete: "past_due",
  incomplete_expired: "canceled",
  trialing: "active",
  paused: "canceled",
};

/**
 * Stripe API v2026-01-28 では current_period_end は
 * Subscription.items.data[0].current_period_end に移動した。
 */
function getPeriodEnd(subscription: Stripe.Subscription): number {
  return subscription.items.data[0]?.current_period_end ?? 0;
}

/** checkout.session.completed: subscriptions UPSERT + users.plan = 'pro' */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!userId || !subscriptionId) {
    console.error("Missing metadata in checkout session", {
      sessionId: session.id,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const supabase = createServiceRoleClient();

  // subscriptions テーブルに UPSERT
  const { error: subError } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      plan: "pro",
      status: "active",
      current_period_end: new Date(getPeriodEnd(subscription) * 1000).toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (subError) {
    console.error("Failed to upsert subscription", subError);
    throw subError;
  }

  // users テーブルの plan と stripe_customer_id を更新
  const { error: userError } = await supabase
    .from("users")
    .update({ plan: "pro", stripe_customer_id: customerId })
    .eq("id", userId);

  if (userError) {
    console.error("Failed to update user plan", userError);
    throw userError;
  }

  console.info("Checkout completed", { userId, subscriptionId });
}

/** customer.subscription.updated / created: status・period_end を同期 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const supabase = createServiceRoleClient();
  const mappedStatus = STRIPE_STATUS_MAP[subscription.status] ?? "canceled";

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: mappedStatus as SubscriptionStatus,
      current_period_end: new Date(getPeriodEnd(subscription) * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to update subscription", error);
    throw error;
  }

  if (subscription.cancel_at_period_end) {
    console.info("Subscription set to cancel at period end", {
      subscriptionId: subscription.id,
      cancelAt: subscription.cancel_at,
    });
  }
}

/** customer.subscription.deleted: users.plan = 'free' + subscriptions 論理削除 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const supabase = createServiceRoleClient();

  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (fetchError || !sub) {
    console.error("Subscription not found in DB", {
      stripeSubscriptionId: subscription.id,
    });
    return;
  }

  const { error: userError } = await supabase
    .from("users")
    .update({ plan: "free" })
    .eq("id", sub.user_id);

  if (userError) {
    console.error("Failed to downgrade user plan", userError);
    throw userError;
  }

  // status を 'deleted' として論理削除
  const { error: subError } = await supabase
    .from("subscriptions")
    .update({ status: "deleted" as SubscriptionStatus })
    .eq("stripe_subscription_id", subscription.id);

  if (subError) {
    console.error("Failed to mark subscription as deleted", subError);
    throw subError;
  }

  console.info("Subscription deleted, user downgraded to free", {
    userId: sub.user_id,
  });
}

/** API v2026-01-28: invoice.subscription は parent.subscription_details.subscription に移動 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

/** invoice.payment_failed: subscriptions.status = 'past_due' */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return; // one-off invoice は無視

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Failed to update subscription status to past_due", error);
    throw error;
  }

  console.warn("Payment failed", {
    subscriptionId,
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count,
  });
}

/** invoice.payment_succeeded: subscriptions.status = 'active' + period_end 更新 */
export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const supabase = createServiceRoleClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: new Date(getPeriodEnd(subscription) * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Failed to update subscription after payment success", error);
    throw error;
  }
}

/** 冪等性: イベント処理済みかチェック */
export async function checkEventProcessed(eventId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", eventId)
    .single();

  return !!data;
}

/** 冪等性: イベントを処理済みとして記録 */
export async function markEventProcessed(
  eventId: string,
  eventType: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("stripe_events")
    .insert({ id: eventId, type: eventType });
}
