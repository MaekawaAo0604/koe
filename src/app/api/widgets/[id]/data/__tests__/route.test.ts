import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}));

const makeParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

const mockWidget = {
  id: "w-1",
  project_id: "proj-1",
  type: "wall",
  config: {
    theme: "light",
    show_rating: true,
    show_date: true,
    show_avatar: true,
    max_items: 10,
    columns: 3,
    border_radius: 8,
    shadow: true,
    font_family: "inherit",
  },
};

const mockProject = { user_id: "user-1" };
const mockUserFree = { plan: "free" };
const mockUserPro = { plan: "pro" };

const mockTestimonials = [
  {
    id: "t-1",
    author_name: "田中太郎",
    author_title: "エンジニア",
    author_company: "Tech Corp",
    author_avatar_url: null,
    rating: 5,
    content: "素晴らしいサービスです",
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "t-2",
    author_name: "山田花子",
    author_title: null,
    author_company: null,
    author_avatar_url: null,
    rating: 4,
    content: "使いやすいです",
    created_at: "2024-01-01T00:00:00Z",
  },
];

/**
 * データAPI用サービスロールクライアントモック
 */
function buildServiceClientMock({
  widgetData = mockWidget,
  widgetError = null,
  projectData = mockProject,
  projectError = null,
  userData = mockUserFree,
  userError = null,
  testimonialData = mockTestimonials,
  testimonialError = null,
}: {
  widgetData?: unknown;
  widgetError?: unknown;
  projectData?: unknown;
  projectError?: unknown;
  userData?: unknown;
  userError?: unknown;
  testimonialData?: unknown;
  testimonialError?: unknown;
}) {
  // ウィジェット取得チェーン: select → eq → single
  const mockWidgetSingle = vi.fn().mockResolvedValue({
    data: widgetData,
    error: widgetError,
  });
  const mockWidgetEq = vi.fn().mockReturnValue({ single: mockWidgetSingle });
  const mockWidgetSelect = vi.fn().mockReturnValue({ eq: mockWidgetEq });

  // プロジェクト取得チェーン: select → eq → single
  const mockProjectSingle = vi.fn().mockResolvedValue({
    data: projectData,
    error: projectError,
  });
  const mockProjectEq = vi.fn().mockReturnValue({ single: mockProjectSingle });
  const mockProjectSelect = vi.fn().mockReturnValue({ eq: mockProjectEq });

  // ユーザー取得チェーン: select → eq → single
  const mockUserSingle = vi.fn().mockResolvedValue({
    data: userData,
    error: userError,
  });
  const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle });
  const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq });

  // テスティモニアル取得チェーン: select → eq → eq → order
  const mockTestimonialsOrder = vi.fn().mockResolvedValue({
    data: testimonialData,
    error: testimonialError,
  });
  const mockTestimonialsEq2 = vi.fn().mockReturnValue({ order: mockTestimonialsOrder });
  const mockTestimonialsEq1 = vi.fn().mockReturnValue({ eq: mockTestimonialsEq2 });
  const mockTestimonialsSelect = vi.fn().mockReturnValue({ eq: mockTestimonialsEq1 });

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "widgets") return { select: mockWidgetSelect };
      if (table === "projects") return { select: mockProjectSelect };
      if (table === "users") return { select: mockUserSelect };
      if (table === "testimonials") return { select: mockTestimonialsSelect };
      return {};
    }),
  };
}

describe("GET /api/widgets/:id/data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("存在しないウィジェットは404を返す", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue(
      buildServiceClientMock({
        widgetData: null,
        widgetError: { code: "PGRST116" },
      }) as never
    );

    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets/nonexistent/data");
    const response = await GET(request, makeParams("nonexistent"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("承認済みテスティモニアルのみを返す（author_email は含まない）", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue(
      buildServiceClientMock({}) as never
    );

    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets/w-1/data");
    const response = await GET(request, makeParams("w-1"));

    expect(response.status).toBe(200);
    const body = await response.json();

    // テスティモニアルが含まれている
    expect(body.testimonials).toHaveLength(2);

    // author_email が含まれていないことを確認
    body.testimonials.forEach((t: Record<string, unknown>) => {
      expect(t).not.toHaveProperty("author_email");
    });

    // 必要なフィールドが含まれている
    const firstTestimonial = body.testimonials[0];
    expect(firstTestimonial).toHaveProperty("id");
    expect(firstTestimonial).toHaveProperty("author_name");
    expect(firstTestimonial).toHaveProperty("rating");
    expect(firstTestimonial).toHaveProperty("content");
  });

  it("FreeプランでもProプランでも plan フィールドが返される", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");

    // Free プラン
    vi.mocked(createServiceRoleClient).mockReturnValue(
      buildServiceClientMock({ userData: mockUserFree }) as never
    );
    const { GET } = await import("../route");

    const request = new NextRequest("http://localhost/api/widgets/w-1/data");
    const response = await GET(request, makeParams("w-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.plan).toBe("free");
    expect(body.widget).toBeDefined();
    expect(body.widget.type).toBe("wall");
  });

  it("ProプランではplanがproでPoweredByバッジを非表示にできる", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue(
      buildServiceClientMock({ userData: mockUserPro }) as never
    );

    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets/w-1/data");
    const response = await GET(request, makeParams("w-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.plan).toBe("pro");
  });

  it("Cache-Controlヘッダーが正しく設定されている", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue(
      buildServiceClientMock({}) as never
    );

    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets/w-1/data");
    const response = await GET(request, makeParams("w-1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
    expect(response.headers.get("Cache-Control")).toContain("stale-while-revalidate=60");
  });

  it("CORSヘッダーが設定されている", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue(
      buildServiceClientMock({}) as never
    );

    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets/w-1/data");
    const response = await GET(request, makeParams("w-1"));

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("max_itemsが設定されている場合は上限を適用する", async () => {
    const widgetWithLimit = {
      ...mockWidget,
      config: { ...mockWidget.config, max_items: 1 },
    };
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    vi.mocked(createServiceRoleClient).mockReturnValue(
      buildServiceClientMock({ widgetData: widgetWithLimit }) as never
    );

    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets/w-1/data");
    const response = await GET(request, makeParams("w-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.testimonials).toHaveLength(1);
  });
});
