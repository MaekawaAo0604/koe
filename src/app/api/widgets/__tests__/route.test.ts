import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/plan", () => ({
  getUserPlan: vi.fn(),
}));

const makeParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

const PROJECT_UUID = "123e4567-e89b-42d3-a456-426614174000";

const mockWidget = {
  id: "w-1",
  project_id: PROJECT_UUID,
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
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockProject = { id: PROJECT_UUID };

/**
 * POST /api/widgets 用モック
 */
function buildPostClientMock({
  user,
  projectData = mockProject,
  projectError = null,
  widgetData = mockWidget,
  widgetError = null,
}: {
  user: { id: string } | null;
  projectData?: unknown;
  projectError?: unknown;
  widgetData?: unknown;
  widgetError?: unknown;
}) {
  const mockProjectMaybeSingle = vi.fn().mockResolvedValue({
    data: projectData,
    error: projectError,
  });
  const mockProjectEq2 = vi.fn().mockReturnValue({ maybeSingle: mockProjectMaybeSingle });
  const mockProjectEq1 = vi.fn().mockReturnValue({ eq: mockProjectEq2 });
  const mockProjectSelect = vi.fn().mockReturnValue({ eq: mockProjectEq1 });

  const mockInsertSingle = vi.fn().mockResolvedValue({
    data: widgetData,
    error: widgetError,
  });
  const mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "projects") return { select: mockProjectSelect };
      if (table === "widgets") return { insert: mockInsert };
      return {};
    }),
  };
}

/**
 * PATCH/DELETE /api/widgets/:id 用モック
 */
function buildIdClientMock({
  user,
  widgetData = mockWidget,
  widgetError = null,
  projectData = mockProject,
  updateData = mockWidget,
  updateError = null,
  deleteError = null,
}: {
  user: { id: string } | null;
  widgetData?: unknown;
  widgetError?: unknown;
  projectData?: unknown;
  updateData?: unknown;
  updateError?: unknown;
  deleteError?: unknown;
}) {
  // ウィジェット取得チェーン: select → eq → single
  const mockWidgetSingle = vi.fn().mockResolvedValue({
    data: widgetData,
    error: widgetError,
  });
  const mockWidgetEq = vi.fn().mockReturnValue({ single: mockWidgetSingle });
  const mockWidgetSelect = vi.fn().mockReturnValue({ eq: mockWidgetEq });

  // プロジェクト存在確認チェーン: select → eq → eq → maybeSingle
  const mockProjectMaybeSingle = vi.fn().mockResolvedValue({
    data: projectData,
    error: null,
  });
  const mockProjectEq2 = vi.fn().mockReturnValue({ maybeSingle: mockProjectMaybeSingle });
  const mockProjectEq1 = vi.fn().mockReturnValue({ eq: mockProjectEq2 });
  const mockProjectSelect = vi.fn().mockReturnValue({ eq: mockProjectEq1 });

  // 更新チェーン: update → eq → select → single
  const mockUpdateSingle = vi.fn().mockResolvedValue({
    data: updateData,
    error: updateError,
  });
  const mockUpdateSelectChain = vi.fn().mockReturnValue({ single: mockUpdateSingle });
  const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelectChain });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

  // 削除チェーン: delete → eq
  const mockDeleteEq = vi.fn().mockResolvedValue({ error: deleteError });
  const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "widgets") {
        return {
          select: mockWidgetSelect,
          update: mockUpdate,
          delete: mockDelete,
        };
      }
      if (table === "projects") {
        return { select: mockProjectSelect };
      }
      return {};
    }),
  };
}

// ---------- POST /api/widgets ----------
describe("POST /api/widgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildPostClientMock({ user: null }) as never
    );

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({ project_id: PROJECT_UUID, type: "wall" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("バリデーションエラー: 無効なtypeで400を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildPostClientMock({ user: { id: "user-1" } }) as never
    );

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({ project_id: PROJECT_UUID, type: "invalid" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("存在しないプロジェクトは404を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildPostClientMock({
        user: { id: "user-1" },
        projectData: null,
        projectError: { code: "PGRST116" },
      }) as never
    );

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({ project_id: "ffffffff-ffff-4fff-bfff-ffffffffffff", type: "wall" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("FreeプランでWall of Love以外のタイプは403を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildPostClientMock({ user: { id: "user-1" } }) as never
    );
    const { getUserPlan } = await import("@/lib/plan");
    vi.mocked(getUserPlan).mockResolvedValue("free");

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({ project_id: PROJECT_UUID, type: "carousel" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("PLAN_LIMIT_REACHED");
  });

  it("FreeプランでWall of Loveは作成できる", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildPostClientMock({ user: { id: "user-1" } }) as never
    );
    const { getUserPlan } = await import("@/lib/plan");
    vi.mocked(getUserPlan).mockResolvedValue("free");

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({ project_id: PROJECT_UUID, type: "wall" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it("ProプランでCarouselタイプを作成できる", async () => {
    const carouselWidget = { ...mockWidget, type: "carousel" };
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildPostClientMock({
        user: { id: "user-1" },
        widgetData: carouselWidget,
      }) as never
    );
    const { getUserPlan } = await import("@/lib/plan");
    vi.mocked(getUserPlan).mockResolvedValue("pro");

    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({ project_id: PROJECT_UUID, type: "carousel" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.type).toBe("carousel");
  });
});

// ---------- PATCH /api/widgets/:id ----------
describe("PATCH /api/widgets/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({ user: null }) as never
    );

    const { PATCH } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/w-1", {
      method: "PATCH",
      body: JSON.stringify({ type: "wall" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("w-1"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("バリデーションエラー: 空オブジェクトで400を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({ user: { id: "user-1" } }) as never
    );

    const { PATCH } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/w-1", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("w-1"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("存在しないウィジェットは404を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({
        user: { id: "user-1" },
        widgetData: null,
        widgetError: { code: "PGRST116" },
      }) as never
    );

    const { PATCH } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ type: "wall" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("nonexistent"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("他のユーザーのウィジェットは403を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({
        user: { id: "other-user" },
        widgetData: mockWidget,
        projectData: null, // オーナーでない
      }) as never
    );

    const { PATCH } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/w-1", {
      method: "PATCH",
      body: JSON.stringify({ type: "wall" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("w-1"));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  it("FreeプランでCarouselへ変更しようとすると403を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({ user: { id: "user-1" } }) as never
    );
    const { getUserPlan } = await import("@/lib/plan");
    vi.mocked(getUserPlan).mockResolvedValue("free");

    const { PATCH } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/w-1", {
      method: "PATCH",
      body: JSON.stringify({ type: "carousel" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("w-1"));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("PLAN_LIMIT_REACHED");
  });

  it("正常な更新は200を返す", async () => {
    const updatedWidget = { ...mockWidget, config: { ...mockWidget.config, theme: "dark" } };
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({
        user: { id: "user-1" },
        updateData: updatedWidget,
      }) as never
    );

    const { PATCH } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/w-1", {
      method: "PATCH",
      body: JSON.stringify({ config: { theme: "dark" } }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("w-1"));

    expect(response.status).toBe(200);
  });
});

// ---------- DELETE /api/widgets/:id ----------
describe("DELETE /api/widgets/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({ user: null }) as never
    );

    const { DELETE } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/w-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("w-1"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("存在しないウィジェットは404を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({
        user: { id: "user-1" },
        widgetData: null,
        widgetError: { code: "PGRST116" },
      }) as never
    );

    const { DELETE } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/nonexistent", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("nonexistent"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("他のユーザーのウィジェットは403を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({
        user: { id: "other-user" },
        widgetData: mockWidget,
        projectData: null,
      }) as never
    );

    const { DELETE } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/w-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("w-1"));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  it("正常な削除は204を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildIdClientMock({ user: { id: "user-1" } }) as never
    );

    const { DELETE } = await import("../[id]/route");
    const request = new NextRequest("http://localhost/api/widgets/w-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("w-1"));

    expect(response.status).toBe(204);
  });
});
