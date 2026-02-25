import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Supabase サーバークライアントのモック
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/plan", () => ({
  getUserPlan: vi.fn(),
  getProjectLimit: vi.fn(),
  isAtLimit: vi.fn(),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    generateSlug: vi.fn((name: string) =>
      name.toLowerCase().replace(/\s+/g, "-")
    ),
  };
});

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockOrder = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

function buildChain() {
  mockMaybeSingle.mockReset();
  mockSingle.mockReset();

  mockEq.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    select: mockSelect,
    order: mockOrder,
  });

  mockSelect.mockReturnValue({
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  });

  mockOrder.mockReturnValue({ eq: mockEq });

  mockInsert.mockReturnValue({ select: mockSelect });

  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
  });
}

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildChain();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: mockFrom,
    } as never);

    const { GET } = await import("../route");
    const response = await GET();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("認証済みの場合はプロジェクト一覧を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    const mockProjects = [
      {
        id: "proj-1",
        name: "Project 1",
        slug: "project-1",
        user_id: "user-1",
        brand_color: "#6366f1",
        testimonials: [{ count: 3 }],
      },
    ];

    mockOrder.mockResolvedValue({ data: mockProjects, error: null });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: mockFrom,
    } as never);

    const { GET } = await import("../route");
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].testimonial_count).toBe(3);
    expect(body[0].testimonials).toBeUndefined();
  });
});

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildChain();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: mockFrom,
    } as never);

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("バリデーションエラーの場合は400を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: mockFrom,
    } as never);

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "" }), // 空の名前
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("Freeプランの上限到達時は403を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

    vi.mocked(getUserPlan).mockResolvedValue("free");
    vi.mocked(getProjectLimit).mockReturnValue(3);
    vi.mocked(isAtLimit).mockReturnValue(true);

    // カウントクエリのモック
    const mockCountResult = { count: 3, error: null };
    const mockHead = vi.fn().mockResolvedValue(mockCountResult);
    const mockSelectWithHead = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: mockHead }) });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({ select: mockSelectWithHead }),
    } as never);

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "New Project" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.code).toBe("PROJECT_LIMIT_REACHED");
  });

  it("有効なデータでプロジェクトを作成する（201を返す）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

    vi.mocked(getUserPlan).mockResolvedValue("pro");
    vi.mocked(getProjectLimit).mockReturnValue(Infinity);
    vi.mocked(isAtLimit).mockReturnValue(false);

    const mockProject = {
      id: "proj-new",
      name: "New Project",
      slug: "new-project",
      user_id: "user-1",
      brand_color: "#6366f1",
    };

    // スラッグ重複チェック: 存在しない
    const mockMaybeSingleFn = vi.fn().mockResolvedValue({ data: null, error: null });
    // INSERT成功
    const mockSingleFn = vi.fn().mockResolvedValue({ data: mockProject, error: null });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingleFn,
            single: mockSingleFn,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingleFn,
          }),
        }),
      }),
    } as never);

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "New Project" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
