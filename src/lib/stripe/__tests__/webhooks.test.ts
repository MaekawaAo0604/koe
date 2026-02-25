import { describe, it, expect, vi, beforeEach } from "vitest";

// Stripe クライアントのモック
vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}));

// Supabase service role クライアントのモック
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => mockSupabase),
}));

import {
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  checkEventProcessed,
  markEventProcessed,
} from "../webhooks";
import { stripe } from "@/lib/stripe/client";
import type Stripe from "stripe";

// Supabase チェーンのビルダーヘルパー
function buildChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    upsert: vi.fn().mockReturnValue(Promise.resolve(result)),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue(Promise.resolve(result)),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(Promise.resolve(result)),
  };
  // update().eq() はチェーンを返し、最終的に Promise に解決
  chain.update.mockImplementation(() => ({
    eq: vi.fn().mockReturnValue(Promise.resolve(result)),
  }));
  return chain;
}

describe("handleCheckoutSessionCompleted", () => {
  beforeEach(() => vi.clearAllMocks());

  it("userId または subscriptionId がない場合は早期リターン", async () => {
    const session = { id: "cs_test", metadata: {} } as Stripe.Checkout.Session;
    // stripe.subscriptions.retrieve が呼ばれないことを確認
    await handleCheckoutSessionCompleted(session);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it("正常に subscriptions UPSERT + users plan=pro を実行する", async () => {
    const mockSub = {
      id: "sub_test",
      items: { data: [{ current_period_end: 1700000000 }] },
    };
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
      mockSub as unknown as Stripe.Subscription
    );

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    mockFrom.mockReturnValue({
      upsert: upsertMock,
      update: updateMock,
    });

    const session = {
      id: "cs_test",
      metadata: { user_id: "user-123" },
      subscription: "sub_test",
      customer: "cus_test",
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutSessionCompleted(session);

    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_test");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        stripe_subscription_id: "sub_test",
        plan: "pro",
        status: "active",
      }),
      { onConflict: "user_id" }
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro", stripe_customer_id: "cus_test" })
    );
  });

  it("subscriptions UPSERT でエラーが発生した場合は throw する", async () => {
    const mockSub = {
      id: "sub_test",
      items: { data: [{ current_period_end: 1700000000 }] },
    };
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
      mockSub as unknown as Stripe.Subscription
    );

    const upsertMock = vi
      .fn()
      .mockResolvedValue({ error: { message: "DB error" } });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    const session = {
      id: "cs_test",
      metadata: { user_id: "user-123" },
      subscription: "sub_test",
      customer: "cus_test",
    } as unknown as Stripe.Checkout.Session;

    await expect(handleCheckoutSessionCompleted(session)).rejects.toEqual({
      message: "DB error",
    });
  });
});

describe("handleSubscriptionUpdated", () => {
  beforeEach(() => vi.clearAllMocks());

  it("active ステータスを正しくマッピングして更新する", async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    mockFrom.mockReturnValue({ update: updateMock });

    const sub = {
      id: "sub_test",
      status: "active",
      cancel_at_period_end: false,
      cancel_at: null,
      items: { data: [{ current_period_end: 1700000000 }] },
    } as unknown as Stripe.Subscription;

    await handleSubscriptionUpdated(sub);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" })
    );
    expect(updateEqMock).toHaveBeenCalledWith(
      "stripe_subscription_id",
      "sub_test"
    );
  });

  it("past_due ステータスを正しくマッピングする", async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    mockFrom.mockReturnValue({ update: updateMock });

    const sub = {
      id: "sub_test",
      status: "past_due",
      cancel_at_period_end: false,
      cancel_at: null,
      items: { data: [{ current_period_end: 1700000000 }] },
    } as unknown as Stripe.Subscription;

    await handleSubscriptionUpdated(sub);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "past_due" })
    );
  });

  it("更新エラーが発生した場合は throw する", async () => {
    const updateEqMock = vi
      .fn()
      .mockResolvedValue({ error: { message: "DB error" } });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    mockFrom.mockReturnValue({ update: updateMock });

    const sub = {
      id: "sub_test",
      status: "active",
      cancel_at_period_end: false,
      items: { data: [{ current_period_end: 1700000000 }] },
    } as unknown as Stripe.Subscription;

    await expect(handleSubscriptionUpdated(sub)).rejects.toEqual({
      message: "DB error",
    });
  });
});

describe("handleSubscriptionDeleted", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DB にサブスクリプションが存在しない場合は早期リターン", async () => {
    const singleMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "not found" } });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ select: selectMock });

    const sub = { id: "sub_test" } as Stripe.Subscription;
    await handleSubscriptionDeleted(sub);

    // users テーブルへのアクセスがないことを確認
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("users.plan=free + subscriptions.status=deleted を実行する", async () => {
    const singleMock = vi
      .fn()
      .mockResolvedValue({ data: { user_id: "user-123" }, error: null });
    const eqSelectMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqSelectMock });

    const userUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const userUpdateMock = vi.fn().mockReturnValue({ eq: userUpdateEqMock });

    const subUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const subUpdateMock = vi.fn().mockReturnValue({ eq: subUpdateEqMock });

    // 3回の from() 呼び出しに対応
    mockFrom
      .mockReturnValueOnce({ select: selectMock }) // subscriptions SELECT
      .mockReturnValueOnce({ update: userUpdateMock }) // users UPDATE
      .mockReturnValueOnce({ update: subUpdateMock }); // subscriptions UPDATE

    const sub = { id: "sub_test" } as Stripe.Subscription;
    await handleSubscriptionDeleted(sub);

    expect(userUpdateMock).toHaveBeenCalledWith({ plan: "free" });
    expect(userUpdateEqMock).toHaveBeenCalledWith("id", "user-123");
    expect(subUpdateMock).toHaveBeenCalledWith({ status: "deleted" });
    expect(subUpdateEqMock).toHaveBeenCalledWith(
      "stripe_subscription_id",
      "sub_test"
    );
  });
});

describe("handleInvoicePaymentFailed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("subscriptionId がない場合 (one-off) は早期リターン", async () => {
    const invoice = { id: "inv_test", parent: null } as Stripe.Invoice;
    await handleInvoicePaymentFailed(invoice);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("subscriptions.status を past_due に更新する", async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    mockFrom.mockReturnValue({ update: updateMock });

    const invoice = {
      id: "inv_test",
      attempt_count: 1,
      parent: {
        subscription_details: { subscription: "sub_test" },
      },
    } as unknown as Stripe.Invoice;

    await handleInvoicePaymentFailed(invoice);

    expect(updateMock).toHaveBeenCalledWith({ status: "past_due" });
    expect(updateEqMock).toHaveBeenCalledWith(
      "stripe_subscription_id",
      "sub_test"
    );
  });
});

describe("handleInvoicePaymentSucceeded", () => {
  beforeEach(() => vi.clearAllMocks());

  it("subscriptionId がない場合は早期リターン", async () => {
    const invoice = { id: "inv_test", parent: null } as Stripe.Invoice;
    await handleInvoicePaymentSucceeded(invoice);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it("subscriptions.status=active + period_end を更新する", async () => {
    const mockSub = {
      id: "sub_test",
      items: { data: [{ current_period_end: 1800000000 }] },
    };
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
      mockSub as unknown as Stripe.Subscription
    );

    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    mockFrom.mockReturnValue({ update: updateMock });

    const invoice = {
      id: "inv_test",
      parent: {
        subscription_details: { subscription: "sub_test" },
      },
    } as unknown as Stripe.Invoice;

    await handleInvoicePaymentSucceeded(invoice);

    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_test");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" })
    );
  });
});

describe("checkEventProcessed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("処理済みイベントの場合 true を返す", async () => {
    const singleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: "evt_test" }, error: null });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ select: selectMock });

    const result = await checkEventProcessed("evt_test");
    expect(result).toBe(true);
  });

  it("未処理イベントの場合 false を返す", async () => {
    const singleMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "not found" } });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ select: selectMock });

    const result = await checkEventProcessed("evt_new");
    expect(result).toBe(false);
  });
});

describe("markEventProcessed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stripe_events テーブルにレコードを挿入する", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await markEventProcessed("evt_test", "checkout.session.completed");

    expect(mockFrom).toHaveBeenCalledWith("stripe_events");
    expect(insertMock).toHaveBeenCalledWith({
      id: "evt_test",
      type: "checkout.session.completed",
    });
  });
});
