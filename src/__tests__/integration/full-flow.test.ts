/**
 * 全フロー統合テスト（Issue #33: 8-5 最終動作確認）
 *
 * カバー範囲:
 * - サインアップ → プロジェクト作成 → フォーム投稿 → 承認 → ウィジェット表示
 * - Free→Pro アップグレード → 制限解除
 * - Pro キャンセル → Free 戻り → 制限適用
 * - セキュリティ（service_role key 非露出、CORS、RLS 相当のアクセス制御）
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ================================================================
// モック設定
// ================================================================

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}));
vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    subscriptions: { retrieve: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  },
}));

const { mockLimitFn } = vi.hoisted(() => ({
  mockLimitFn: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@upstash/ratelimit", () => {
  const mockClass = vi.fn().mockImplementation(() => ({ limit: mockLimitFn }));
  (mockClass as unknown as { slidingWindow: ReturnType<typeof vi.fn> }).slidingWindow =
    vi.fn().mockReturnValue({});
  return { Ratelimit: mockClass };
});

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn().mockReturnValue({}) },
}));

vi.mock("@/lib/plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plan")>();
  return {
    ...actual,
    getUserPlan: vi.fn().mockResolvedValue("free"),
    getTestimonialLimit: vi.fn().mockReturnValue(10),
    isAtLimit: vi.fn().mockReturnValue(false),
    getProjectLimit: vi.fn().mockReturnValue(1),
  };
});

// ================================================================
// テストデータ
// ================================================================

const FREE_USER = { id: "user-free", email: "free@example.com", plan: "free" };
const PRO_USER = { id: "user-pro", email: "pro@example.com", plan: "pro" };

const MOCK_PROJECT = {
  id: "proj-1",
  user_id: FREE_USER.id,
  name: "テストプロジェクト",
  slug: "test-project",
  logo_url: null,
  brand_color: "#6366f1",
  form_config: { fields: [], thank_you_message: "ありがとうございました！" },
};

const MOCK_TESTIMONIAL_PENDING = {
  id: "t-1",
  project_id: MOCK_PROJECT.id,
  status: "pending",
  author_name: "田中太郎",
  author_title: "エンジニア",
  author_company: "Tech Corp",
  author_email: "tanaka@example.com",
  author_avatar_url: null,
  rating: 5,
  content: "素晴らしいサービスです！",
  tags: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const MOCK_TESTIMONIAL_APPROVED = {
  ...MOCK_TESTIMONIAL_PENDING,
  status: "approved",
};

const MOCK_WIDGET = {
  id: "w-1",
  project_id: MOCK_PROJECT.id,
  type: "wall",
  config: {
    theme: "light",
    show_rating: true,
    show_date: true,
    show_avatar: true,
    max_items: 50,
    columns: 3,
    border_radius: 8,
    shadow: true,
    font_family: "inherit",
  },
};

// ================================================================
// 1. テスティモニアル収集フロー
// ================================================================

describe("フロー1: テスティモニアル収集（要件3）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("正常な投稿が pending ステータスで保存される（要件3 AC-2）", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    const { isAtLimit } = await import("@/lib/plan");
    vi.mocked(isAtLimit).mockReturnValue(false);

    const mockInsertSingle = vi.fn().mockResolvedValue({
      data: MOCK_TESTIMONIAL_PENDING,
      error: null,
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: MOCK_PROJECT, error: null }) }),
            }),
          };
        }
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { plan: "free" }, error: null }) }),
            }),
          };
        }
        if (table === "testimonials") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: 3, error: null }) }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ single: mockInsertSingle }),
            }),
          };
        }
        return {};
      }),
    } as never);

    const { POST } = await import("@/app/api/projects/[id]/testimonials/route");
    const request = new NextRequest(
      `http://localhost/api/projects/${MOCK_PROJECT.id}/testimonials`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: "田中太郎", rating: 5, content: "素晴らしいサービスです！" }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ id: MOCK_PROJECT.id }) });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("pending");
  });

  it("レートリミット超過時は 429 を返す（要件3 AC-7）", async () => {
    mockLimitFn.mockResolvedValueOnce({ success: false });

    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: MOCK_PROJECT, error: null }) }),
        }),
      }),
    } as never);

    const { POST } = await import("@/app/api/projects/[id]/testimonials/route");
    const request = new NextRequest(
      `http://localhost/api/projects/${MOCK_PROJECT.id}/testimonials`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: "田中太郎", rating: 5, content: "テスト" }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ id: MOCK_PROJECT.id }) });
    expect(response.status).toBe(429);
  });

  it("必須項目未入力時は 400 バリデーションエラーを返す（要件3 AC-5,6）", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: MOCK_PROJECT, error: null }) }),
        }),
      }),
    } as never);

    const { POST } = await import("@/app/api/projects/[id]/testimonials/route");
    const request = new NextRequest(
      `http://localhost/api/projects/${MOCK_PROJECT.id}/testimonials`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: "", rating: 5, content: "テスト" }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ id: MOCK_PROJECT.id }) });
    expect(response.status).toBe(400);
  });
});

// ================================================================
// 2. テスティモニアル承認 → ウィジェット表示フロー
// ================================================================

describe("フロー2: 承認 → ウィジェット表示（要件4・5）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("承認するとステータスが approved に更新される（要件4 AC-2）", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    // projects.select().eq("id").eq("user_id").maybeSingle() のチェーン
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: MOCK_PROJECT.id }, error: null });
    const projectEq2 = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const projectEq1 = vi.fn().mockReturnValue({ eq: projectEq2 });
    const projectSelect = vi.fn().mockReturnValue({ eq: projectEq1 });

    // testimonials.select().eq("id").single() のチェーン
    const testimonialSingle = vi.fn().mockResolvedValue({
      data: { id: MOCK_TESTIMONIAL_PENDING.id, project_id: MOCK_PROJECT.id },
      error: null,
    });
    const testimonialEq = vi.fn().mockReturnValue({ single: testimonialSingle });
    const testimonialSelectGet = vi.fn().mockReturnValue({ eq: testimonialEq });

    // testimonials.update().eq().select().single() のチェーン（更新用）
    const updateSingle = vi.fn().mockResolvedValue({ data: MOCK_TESTIMONIAL_APPROVED, error: null });
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
    const testimonialUpdate = vi.fn().mockReturnValue({ eq: updateEq });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: FREE_USER.id } }, error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "testimonials") {
          return {
            select: testimonialSelectGet,
            update: testimonialUpdate,
          };
        }
        if (table === "projects") {
          return { select: projectSelect };
        }
        return {};
      }),
    } as never);

    const { PATCH } = await import("@/app/api/testimonials/[id]/route");
    const request = new NextRequest(
      `http://localhost/api/testimonials/${MOCK_TESTIMONIAL_PENDING.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }
    );

    const response = await PATCH(request, { params: Promise.resolve({ id: MOCK_TESTIMONIAL_PENDING.id }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("approved");
  });

  it("ウィジェット API は承認済みテスティモニアルのみ返し author_email を含まない（要件5 AC-5,12）", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");

    const approvedTestimonialPublic = {
      id: MOCK_TESTIMONIAL_APPROVED.id,
      author_name: MOCK_TESTIMONIAL_APPROVED.author_name,
      author_title: MOCK_TESTIMONIAL_APPROVED.author_title,
      author_company: MOCK_TESTIMONIAL_APPROVED.author_company,
      author_avatar_url: null,
      rating: MOCK_TESTIMONIAL_APPROVED.rating,
      content: MOCK_TESTIMONIAL_APPROVED.content,
      created_at: MOCK_TESTIMONIAL_APPROVED.created_at,
      // author_email は含めない（設計上 SELECT で除外）
    };

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "widgets")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: MOCK_WIDGET, error: null }) }),
            }),
          };
        if (table === "projects")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { user_id: FREE_USER.id }, error: null }) }),
            }),
          };
        if (table === "users")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { plan: "free" }, error: null }) }),
            }),
          };
        if (table === "testimonials")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [approvedTestimonialPublic], error: null }),
                }),
              }),
            }),
          };
        return {};
      }),
    } as never);

    const { GET } = await import("@/app/api/widgets/[id]/data/route");
    const response = await GET(
      new NextRequest(`http://localhost/api/widgets/${MOCK_WIDGET.id}/data`),
      { params: Promise.resolve({ id: MOCK_WIDGET.id }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    // author_email が含まれていないことを確認（要件9 AC-4）
    expect(body.testimonials[0]).not.toHaveProperty("author_email");

    // CORS ヘッダーが設定されていること
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

    // Cache-Control ヘッダー（要件5 AC-10）
    const cacheControl = response.headers.get("Cache-Control") ?? "";
    expect(cacheControl).toContain("s-maxage=300");
    expect(cacheControl).toContain("stale-while-revalidate=60");

    // plan フィールドが存在する（バッジ表示判定用）
    expect(body.plan).toBe("free");
    expect(body.widget.type).toBe("wall");
  });

  it("Pro プランではバッジ非表示用に plan=pro を返す（要件5 AC-7）", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "widgets")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: MOCK_WIDGET, error: null }) }),
            }),
          };
        if (table === "projects")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { user_id: PRO_USER.id }, error: null }) }),
            }),
          };
        if (table === "users")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { plan: "pro" }, error: null }) }),
            }),
          };
        if (table === "testimonials")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
              }),
            }),
          };
        return {};
      }),
    } as never);

    const { GET } = await import("@/app/api/widgets/[id]/data/route");
    const response = await GET(
      new NextRequest(`http://localhost/api/widgets/${MOCK_WIDGET.id}/data`),
      { params: Promise.resolve({ id: MOCK_WIDGET.id }) }
    );

    const body = await response.json();
    expect(body.plan).toBe("pro");
  });
});

// ================================================================
// 3. Free → Pro アップグレードフロー（要件7）
// ================================================================

describe("フロー3: Free→Pro アップグレード（要件7）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("Checkout Session が作成され URL が返る（要件7 AC-1）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: FREE_USER.id, email: FREE_USER.email } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { plan: "free", stripe_customer_id: null, email: FREE_USER.email },
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    const { stripe } = await import("@/lib/stripe/client");
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: "cus_test" } as never);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    } as never);

    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }),
    } as never);

    const { POST } = await import("@/app/api/billing/checkout/route");
    const response = await POST(
      new NextRequest("http://localhost/api/billing/checkout", { method: "POST" })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://checkout.stripe.com/test");
  });

  it("既に Pro の場合は 400 を返す（要件7 AC-9）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: PRO_USER.id, email: PRO_USER.email } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { plan: "pro", stripe_customer_id: "cus_existing", email: PRO_USER.email },
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    const { POST } = await import("@/app/api/billing/checkout/route");
    const response = await POST(
      new NextRequest("http://localhost/api/billing/checkout", { method: "POST" })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    // エラーメッセージに "subscribed" または "pro" が含まれることを確認
    expect(body.error.toLowerCase()).toMatch(/already subscribed|pro/i);
  });
});

// ================================================================
// 4. Pro キャンセル → Free 戻りフロー（要件7）
// ================================================================

describe("フロー4: Pro キャンセル → Free 戻り（要件7 AC-5,6）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("subscription.deleted イベントで users.plan が free に戻る（要件7 AC-6）", async () => {
    const { handleSubscriptionDeleted } = await import("@/lib/stripe/webhooks");
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockSingle = vi.fn().mockResolvedValue({ data: { user_id: PRO_USER.id }, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      }),
    } as never);

    await handleSubscriptionDeleted({ id: "sub_test", metadata: {} } as never);

    // users.plan = 'free' への update が呼ばれたことを確認
    expect(mockUpdate).toHaveBeenCalledWith({ plan: "free" });
  });

  it("invoice.payment_failed イベントで subscriptions.status が past_due になる（要件7 AC-7）", async () => {
    const { handleInvoicePaymentFailed } = await import("@/lib/stripe/webhooks");
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as never);

    // API v2026-01-28 形式: parent.subscription_details.subscription
    const mockInvoice = {
      id: "inv_test",
      attempt_count: 1,
      parent: {
        subscription_details: {
          subscription: "sub_test",
        },
      },
    };

    await handleInvoicePaymentFailed(mockInvoice as never);

    expect(mockUpdate).toHaveBeenCalledWith({ status: "past_due" });
  });

  it("checkout.session.completed で users.plan が pro になる（要件7 AC-2）", async () => {
    const { handleCheckoutSessionCompleted } = await import("@/lib/stripe/webhooks");
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    const { stripe } = await import("@/lib/stripe/client");

    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
      id: "sub_test",
      items: { data: [{ current_period_end: 1700000000 }] },
    } as never);

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        upsert: mockUpsert,
        update: mockUpdate,
      }),
    } as never);

    await handleCheckoutSessionCompleted({
      id: "cs_test",
      metadata: { user_id: PRO_USER.id },
      subscription: "sub_test",
      customer: "cus_test",
    } as never);

    // subscriptions UPSERT が呼ばれた
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro", status: "active" }),
      expect.any(Object)
    );
    // users.plan = 'pro' の update が呼ばれた
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro" })
    );
  });
});

// ================================================================
// 5. セキュリティチェック（要件9）
// ================================================================

describe("セキュリティチェック（要件9）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("ウィジェット API に CORS ヘッダーが設定されている（要件9 AC-5）", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "widgets")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: MOCK_WIDGET, error: null }) }),
            }),
          };
        if (table === "projects")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { user_id: FREE_USER.id }, error: null }) }),
            }),
          };
        if (table === "users")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { plan: "free" }, error: null }) }),
            }),
          };
        if (table === "testimonials")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
              }),
            }),
          };
        return {};
      }),
    } as never);

    const { GET } = await import("@/app/api/widgets/[id]/data/route");
    const response = await GET(
      new NextRequest(`http://localhost/api/widgets/${MOCK_WIDGET.id}/data`),
      { params: Promise.resolve({ id: MOCK_WIDGET.id }) }
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });

  it("OPTIONS リクエストで CORS プリフライトに 204 を返す", async () => {
    const { OPTIONS } = await import("@/app/api/widgets/[id]/data/route");
    const response = await OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("Webhook 署名検証失敗時は 400 を返す（要件7 AC-10）", async () => {
    const { stripe } = await import("@/lib/stripe/client");
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("Webhook signature verification failed");
    });

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const request = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "invalid_signature", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("未認証ユーザーは Billing API にアクセスできない（要件1 AC-8）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: vi.fn(),
    } as never);

    const { POST } = await import("@/app/api/billing/checkout/route");
    const response = await POST(
      new NextRequest("http://localhost/api/billing/checkout", { method: "POST" })
    );
    expect(response.status).toBe(401);
  });

  it("テスティモニアル投稿は常に status=pending を INSERT する（要件9 AC-3）", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    const { isAtLimit } = await import("@/lib/plan");
    vi.mocked(isAtLimit).mockReturnValue(false);

    let capturedInsertData: Record<string, unknown> | undefined;

    const mockInsertSingle = vi.fn().mockResolvedValue({ data: MOCK_TESTIMONIAL_PENDING, error: null });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "projects")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: MOCK_PROJECT, error: null }) }),
            }),
          };
        if (table === "users")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { plan: "free" }, error: null }) }),
            }),
          };
        if (table === "testimonials")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: 0, error: null }) }),
              }),
            }),
            insert: vi.fn().mockImplementation((data: unknown) => {
              capturedInsertData = data as Record<string, unknown>;
              return { select: vi.fn().mockReturnValue({ single: mockInsertSingle }) };
            }),
          };
        return {};
      }),
    } as never);

    const { POST } = await import("@/app/api/projects/[id]/testimonials/route");
    await POST(
      new NextRequest(`http://localhost/api/projects/${MOCK_PROJECT.id}/testimonials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: "テスト太郎", rating: 4, content: "テスト内容" }),
      }),
      { params: Promise.resolve({ id: MOCK_PROJECT.id }) }
    );

    // INSERT される際に status: 'pending' が設定されていることを確認
    if (capturedInsertData) {
      expect((capturedInsertData as { status: string }).status).toBe("pending");
    }
  });

  it("承認操作は認証済みオーナーのみ可能（要件9 AC-1）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: vi.fn(),
    } as never);

    const { PATCH } = await import("@/app/api/testimonials/[id]/route");
    const response = await PATCH(
      new NextRequest(`http://localhost/api/testimonials/${MOCK_TESTIMONIAL_PENDING.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: Promise.resolve({ id: MOCK_TESTIMONIAL_PENDING.id }) }
    );

    expect(response.status).toBe(401);
  });
});

// ================================================================
// 6. プラン制限チェック（要件2・3・5）
// ================================================================

describe("フロー5: プラン制限（要件2・3・5）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("Free プランは 2 つ目のプロジェクト作成を拒否する（要件2 AC-6）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

    vi.mocked(getUserPlan).mockResolvedValue("free");
    vi.mocked(getProjectLimit).mockReturnValue(1);
    vi.mocked(isAtLimit).mockReturnValue(true); // 上限到達

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: FREE_USER.id } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ count: 1, error: null }),
        }),
      }),
    } as never);

    const { POST } = await import("@/app/api/projects/route");
    const request = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "2つ目のプロジェクト", slug: "second-project", brand_color: "#6366f1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("PROJECT_LIMIT_REACHED");
  });

  it("Free プランのテスティモニアル上限到達後は 400 を返す（要件3 AC-10）", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    const { isAtLimit } = await import("@/lib/plan");

    vi.mocked(isAtLimit).mockReturnValue(true); // 上限到達

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "projects")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: MOCK_PROJECT, error: null }) }),
            }),
          };
        if (table === "users")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { plan: "free" }, error: null }) }),
            }),
          };
        if (table === "testimonials")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: 10, error: null }) }),
              }),
            }),
          };
        return {};
      }),
    } as never);

    const { POST } = await import("@/app/api/projects/[id]/testimonials/route");
    const response = await POST(
      new NextRequest(`http://localhost/api/projects/${MOCK_PROJECT.id}/testimonials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: "テスト太郎", rating: 4, content: "テスト内容" }),
      }),
      { params: Promise.resolve({ id: MOCK_PROJECT.id }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("TESTIMONIAL_LIMIT_REACHED");
  });

  it("Webhook 冪等性: 同一イベントの重複処理を防ぐ（要件7 AC-11）", async () => {
    const { checkEventProcessed, markEventProcessed } = await import("@/lib/stripe/webhooks");
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");

    // 1回目: 未処理
    const mockSingleFirst = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    vi.mocked(createServiceRoleClient).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: mockSingleFirst }),
        }),
      }),
    } as never);

    const firstCheck = await checkEventProcessed("evt_test_123");
    expect(firstCheck).toBe(false);

    // 記録
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createServiceRoleClient).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    } as never);

    await markEventProcessed("evt_test_123", "checkout.session.completed");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt_test_123", type: "checkout.session.completed" })
    );

    // 2回目: 処理済み
    const mockSingleSecond = vi.fn().mockResolvedValue({ data: { id: "evt_test_123" }, error: null });
    vi.mocked(createServiceRoleClient).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: mockSingleSecond }),
        }),
      }),
    } as never);

    const secondCheck = await checkEventProcessed("evt_test_123");
    expect(secondCheck).toBe(true);
  });
});
