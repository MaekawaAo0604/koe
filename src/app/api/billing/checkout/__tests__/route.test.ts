import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}));

function makeRequest() {
  return new NextRequest("http://localhost/api/billing/checkout", {
    method: "POST",
  });
}

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合は 401 を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as never);

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("既に Pro プランの場合は 400 を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@example.com" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { plan: "pro", stripe_customer_id: "cus_xxx", email: "test@example.com" },
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Already subscribed to Pro plan");
  });

  it("Free ユーザーで Checkout Session を作成し URL を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { stripe } = await import("@/lib/stripe/client");

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@example.com" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { plan: "free", stripe_customer_id: "cus_existing", email: "test@example.com" },
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_xxx",
    } as never);

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/c/pay/cs_xxx");
  });

  it("Stripe API エラー時は 500 を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { stripe } = await import("@/lib/stripe/client");

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@example.com" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { plan: "free", stripe_customer_id: "cus_existing", email: "test@example.com" },
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(
      new Error("Stripe error")
    );

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create checkout session");
  });
});
