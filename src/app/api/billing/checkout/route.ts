import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { stripe } from "@/lib/stripe/client";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

// POST /api/billing/checkout — Stripe Checkout Session を作成して URL を返す
export async function POST(_request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ユーザー情報取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData, error: userError } = await (supabase.from("users") as any)
    .select("plan, stripe_customer_id, email")
    .eq("id", user.id)
    .single() as { data: Pick<UserRow, "plan" | "stripe_customer_id" | "email"> | null; error: unknown };

  if (userError || !userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 既に Pro の場合は拒否
  if (userData.plan === "pro") {
    return NextResponse.json(
      { error: "Already subscribed to Pro plan" },
      { status: 400 }
    );
  }

  try {
    // Stripe Customer がなければ作成
    let customerId = userData.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email ?? user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // stripe_customer_id を保存（RLS バイパスのため Service Role を使用）
      const serviceSupabase = createServiceRoleClient();
      await serviceSupabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Checkout Session 作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      locale: "ja",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create checkout session", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
