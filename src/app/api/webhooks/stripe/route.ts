import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  checkEventProcessed,
  markEventProcessed,
} from "@/lib/stripe/webhooks";

export const runtime = "nodejs";

// POST /api/webhooks/stripe — Stripe Webhook イベントを受信・処理する
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // 署名検証
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim()
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  // 冪等性チェック（同一イベントの重複処理を防ぐ）
  const isProcessed = await checkEventProcessed(event.id);
  if (isProcessed) {
    console.info("Event already processed, skipping", { eventId: event.id });
    return NextResponse.json({ received: true });
  }

  // イベントタイプに応じた処理
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
        // checkout.session.completed で処理済みの場合が多いが、安全策として同じ処理を実行
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        console.info("Unhandled event type", { type: event.type });
    }

    // 処理済みイベントを記録
    await markEventProcessed(event.id, event.type);
  } catch (error) {
    console.error("Webhook handler failed", {
      eventType: event.type,
      eventId: event.id,
      error,
    });
    // 500 を返すと Stripe がリトライする
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
