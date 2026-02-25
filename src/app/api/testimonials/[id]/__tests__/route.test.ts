import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const makeParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

const mockTestimonial = {
  id: "t-1",
  project_id: "proj-1",
};

const mockProject = { id: "proj-1" };

/**
 * Supabase クライアントのモックを構築するヘルパー
 * - testimonials テーブル: select → eq → single
 * - projects テーブル: select → eq → eq → maybeSingle
 * - testimonials テーブル: update → eq → select → single
 * - testimonials テーブル: delete → eq
 */
function buildClientMock({
  user,
  testimonialData,
  testimonialError = null,
  projectData,
  updateData,
  updateError = null,
  deleteError = null,
}: {
  user: { id: string } | null;
  testimonialData?: unknown;
  testimonialError?: unknown;
  projectData?: unknown;
  updateData?: unknown;
  updateError?: unknown;
  deleteError?: unknown;
}) {
  const mockTestimonialSingle = vi.fn().mockResolvedValue({
    data: testimonialData ?? null,
    error: testimonialError,
  });
  const mockTestimonialEq = vi.fn().mockReturnValue({ single: mockTestimonialSingle });
  const mockTestimonialSelect = vi.fn().mockReturnValue({ eq: mockTestimonialEq });

  const mockProjectMaybeSingle = vi.fn().mockResolvedValue({
    data: projectData ?? null,
    error: null,
  });
  const mockProjectEq2 = vi.fn().mockReturnValue({ maybeSingle: mockProjectMaybeSingle });
  const mockProjectEq1 = vi.fn().mockReturnValue({ eq: mockProjectEq2 });
  const mockProjectSelect = vi.fn().mockReturnValue({ eq: mockProjectEq1 });

  const mockUpdateSingle = vi.fn().mockResolvedValue({
    data: updateData ?? null,
    error: updateError,
  });
  const mockUpdateSelectChain = vi.fn().mockReturnValue({ single: mockUpdateSingle });
  const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelectChain });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

  const mockDeleteEq = vi.fn().mockResolvedValue({ error: deleteError });
  const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "testimonials") {
        return {
          select: mockTestimonialSelect,
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

describe("PATCH /api/testimonials/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({ user: null }) as never
    );

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("t-1"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("バリデーションエラー: 空オブジェクトで400を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({ user: { id: "user-1" } }) as never
    );

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("t-1"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("バリデーションエラー: 無効なstatusで400を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({ user: { id: "user-1" } }) as never
    );

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "pending" }), // pending は PATCH 不可
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("t-1"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("存在しないテスティモニアルは404を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "user-1" },
        testimonialData: null,
        testimonialError: { code: "PGRST116" },
      }) as never
    );

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("nonexistent"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("他のユーザーのテスティモニアルは403を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "other-user" },
        testimonialData: mockTestimonial,
        projectData: null, // オーナー不一致: プロジェクト取得失敗
      }) as never
    );

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("t-1"));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  it("statusをapprovedに更新できる（200）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "user-1" },
        testimonialData: mockTestimonial,
        projectData: mockProject,
        updateData: { ...mockTestimonial, status: "approved" },
      }) as never
    );

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("t-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("approved");
  });

  it("statusをrejectedに更新できる（200）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "user-1" },
        testimonialData: mockTestimonial,
        projectData: mockProject,
        updateData: { ...mockTestimonial, status: "rejected" },
      }) as never
    );

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "rejected" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("t-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("rejected");
  });

  it("tagsを更新できる（200）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "user-1" },
        testimonialData: mockTestimonial,
        projectData: mockProject,
        updateData: { ...mockTestimonial, tags: ["おすすめ", "最高"] },
      }) as never
    );

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "PATCH",
      body: JSON.stringify({ tags: ["おすすめ", "最高"] }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("t-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tags).toEqual(["おすすめ", "最高"]);
  });

  it("表示名（author_name）を更新できる（200）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "user-1" },
        testimonialData: mockTestimonial,
        projectData: mockProject,
        updateData: { ...mockTestimonial, author_name: "田中 花子" },
      }) as never
    );

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "PATCH",
      body: JSON.stringify({ author_name: "田中 花子" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("t-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.author_name).toBe("田中 花子");
  });
});

describe("DELETE /api/testimonials/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({ user: null }) as never
    );

    const { DELETE } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("t-1"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("存在しないテスティモニアルは404を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "user-1" },
        testimonialData: null,
        testimonialError: { code: "PGRST116" },
      }) as never
    );

    const { DELETE } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/nonexistent", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("nonexistent"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("他のユーザーのテスティモニアルは403を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "other-user" },
        testimonialData: mockTestimonial,
        projectData: null,
      }) as never
    );

    const { DELETE } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("t-1"));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  it("テスティモニアルを正常に削除する（204）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "user-1" },
        testimonialData: mockTestimonial,
        projectData: mockProject,
        deleteError: null,
      }) as never
    );

    const { DELETE } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("t-1"));

    expect(response.status).toBe(204);
  });

  it("削除時にDBエラーが発生した場合は500を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      buildClientMock({
        user: { id: "user-1" },
        testimonialData: mockTestimonial,
        projectData: mockProject,
        deleteError: { message: "DB error" },
      }) as never
    );

    const { DELETE } = await import("../route");
    const request = new NextRequest("http://localhost/api/testimonials/t-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("t-1"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
