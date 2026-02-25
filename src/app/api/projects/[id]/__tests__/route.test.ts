import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const makeParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("GET /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as never);

    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects/proj-1");
    const response = await GET(request, makeParams("proj-1"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("存在しないプロジェクトは404を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");

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
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
            }),
          }),
        }),
      }),
    } as never);

    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects/nonexistent");
    const response = await GET(request, makeParams("nonexistent"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("オーナーのプロジェクトを返す（200）", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    const mockProject = {
      id: "proj-1",
      name: "Project 1",
      slug: "project-1",
      user_id: "user-1",
    };

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
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
            }),
          }),
        }),
      }),
    } as never);

    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects/proj-1");
    const response = await GET(request, makeParams("proj-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("proj-1");
  });
});

describe("PATCH /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as never);

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects/proj-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("proj-1"));

    expect(response.status).toBe(401);
  });

  it("バリデーションエラーで400を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as never);

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects/proj-1", {
      method: "PATCH",
      body: JSON.stringify({ brand_color: "invalid-color" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("proj-1"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("プロジェクトを正常に更新する（200）", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    const updatedProject = {
      id: "proj-1",
      name: "Updated Name",
      slug: "project-1",
      user_id: "user-1",
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedProject, error: null }),
              }),
            }),
          }),
        }),
      }),
    } as never);

    const { PATCH } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects/proj-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, makeParams("proj-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Updated Name");
  });
});

describe("DELETE /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("未認証の場合は401を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as never);

    const { DELETE } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects/proj-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("proj-1"));

    expect(response.status).toBe(401);
  });

  it("存在しないプロジェクトは404を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");

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
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as never);

    const { DELETE } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects/nonexistent", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("nonexistent"));

    expect(response.status).toBe(404);
  });

  it("プロジェクトを正常に削除する（204）", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    const mockEqDelete = vi.fn().mockResolvedValue({ error: null });
    const mockEqChain = vi.fn().mockReturnValue({ eq: mockEqDelete });

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
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "proj-1" },
                error: null,
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: mockEqChain,
        }),
      }),
    } as never);

    const { DELETE } = await import("../route");
    const request = new NextRequest("http://localhost/api/projects/proj-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("proj-1"));

    expect(response.status).toBe(204);
  });
});
