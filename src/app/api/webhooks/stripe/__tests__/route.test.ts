import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Stripe クライアントのモック
vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

// Webhook ハンドラのモック
vi.mock("@/lib/stripe/webhooks", () => ({
  handleCheckoutSessionCompleted: vi.fn(),
  handleSubscriptionUpdated: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handleInvoicePaymentFailed: vi.fn(),
  handleInvoicePaymentSucceeded: vi.fn(),
  checkEventProcessed: vi.fn(),
  markEventProcessed: vi.fn(),
}));

function makeWebhookRequest(body: string, signature: string) {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stripe-signature ヘッダーがない場合は 400 を返す", async () => {
    const request = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });

    const { POST } = await import("../route");
    const res = await POST(request);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing stripe-signature");
  });

  it("署名検証に失敗した場合は 400 を返す", async () => {
    const { stripe } = await import("@/lib/stripe/client");
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const { POST } = await import("../route");
    const res = await POST(makeWebhookRequest("{}", "invalid-sig"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Webhook Error");
  });

  it("処理済みイベントはスキップして 200 を返す", async () => {
    const { stripe } = await import("@/lib/stripe/client");
    const { checkEventProcessed } = await import("@/lib/stripe/webhooks");

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_test",
      type: "checkout.session.completed",
      data: { object: {} },
    } as never);

    vi.mocked(checkEventProcessed).mockResolvedValue(true);

    const { POST } = await import("../route");
    const res = await POST(makeWebhookRequest("{}", "sig"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it("checkout.session.completed を正常に処理する", async () => {
    const { stripe } = await import("@/lib/stripe/client");
    const {
      checkEventProcessed,
      markEventProcessed,
      handleCheckoutSessionCompleted,
    } = await import("@/lib/stripe/webhooks");

    const mockSession = { id: "cs_test", metadata: { user_id: "user-1" } };

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_test",
      type: "checkout.session.completed",
      data: { object: mockSession },
    } as never);

    vi.mocked(checkEventProcessed).mockResolvedValue(false);
    vi.mocked(handleCheckoutSessionCompleted).mockResolvedValue(undefined);
    vi.mocked(markEventProcessed).mockResolvedValue(undefined);

    const { POST } = await import("../route");
    const res = await POST(makeWebhookRequest("{}", "sig"));

    expect(res.status).toBe(200);
    expect(handleCheckoutSessionCompleted).toHaveBeenCalledWith(mockSession);
    expect(markEventProcessed).toHaveBeenCalledWith("evt_test", "checkout.session.completed");
  });

  it("customer.subscription.deleted を正常に処理する", async () => {
    const { stripe } = await import("@/lib/stripe/client");
    const {
      checkEventProcessed,
      markEventProcessed,
      handleSubscriptionDeleted,
    } = await import("@/lib/stripe/webhooks");

    const mockSubscription = { id: "sub_test" };

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_del",
      type: "customer.subscription.deleted",
      data: { object: mockSubscription },
    } as never);

    vi.mocked(checkEventProcessed).mockResolvedValue(false);
    vi.mocked(handleSubscriptionDeleted).mockResolvedValue(undefined);
    vi.mocked(markEventProcessed).mockResolvedValue(undefined);

    const { POST } = await import("../route");
    const res = await POST(makeWebhookRequest("{}", "sig"));

    expect(res.status).toBe(200);
    expect(handleSubscriptionDeleted).toHaveBeenCalledWith(mockSubscription);
  });

  it("ハンドラがエラーを投げた場合は 500 を返す", async () => {
    const { stripe } = await import("@/lib/stripe/client");
    const {
      checkEventProcessed,
      handleCheckoutSessionCompleted,
    } = await import("@/lib/stripe/webhooks");

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_err",
      type: "checkout.session.completed",
      data: { object: {} },
    } as never);

    vi.mocked(checkEventProcessed).mockResolvedValue(false);
    vi.mocked(handleCheckoutSessionCompleted).mockRejectedValue(
      new Error("DB error")
    );

    const { POST } = await import("../route");
    const res = await POST(makeWebhookRequest("{}", "sig"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Webhook handler failed");
  });
});
