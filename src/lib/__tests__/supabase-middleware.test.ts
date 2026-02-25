import { describe, it, expect, vi, beforeEach } from "vitest";

// @supabase/ssr のモック
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

// next/server のモック
vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => ({
      cookies: {
        set: vi.fn(),
        getAll: vi.fn(() => []),
      },
    })),
  },
}));

describe("lib/supabase/middleware.ts - updateSession", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: null },
    });
  });

  it("createServerClient を環境変数で呼び出す", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: mockGetUser },
    } as ReturnType<typeof createServerClient>);

    const { updateSession } = await import("@/lib/supabase/middleware");

    const mockRequest = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      },
    } as Parameters<typeof updateSession>[0];

    await updateSession(mockRequest);

    expect(createServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.any(Object)
    );
  });

  it("getUser() を呼んでトークンリフレッシュをトリガーする（要件1 AC-9）", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: mockGetUser },
    } as ReturnType<typeof createServerClient>);

    const { updateSession } = await import("@/lib/supabase/middleware");

    const mockRequest = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      },
    } as Parameters<typeof updateSession>[0];

    await updateSession(mockRequest);

    expect(mockGetUser).toHaveBeenCalled();
  });

  it("未認証の場合、user は null を返す", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: mockGetUser },
    } as ReturnType<typeof createServerClient>);

    const { updateSession } = await import("@/lib/supabase/middleware");

    const mockRequest = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      },
    } as Parameters<typeof updateSession>[0];

    const { user } = await updateSession(mockRequest);

    expect(user).toBeNull();
  });

  it("認証済みの場合、user オブジェクトを返す", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });

    const { createServerClient } = await import("@supabase/ssr");
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: mockGetUser },
    } as ReturnType<typeof createServerClient>);

    const { updateSession } = await import("@/lib/supabase/middleware");

    const mockRequest = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      },
    } as Parameters<typeof updateSession>[0];

    const { user } = await updateSession(mockRequest);

    expect(user).toEqual(mockUser);
  });

  it("supabaseResponse を返す", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: mockGetUser },
    } as ReturnType<typeof createServerClient>);

    const { updateSession } = await import("@/lib/supabase/middleware");

    const mockRequest = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      },
    } as Parameters<typeof updateSession>[0];

    const { supabaseResponse } = await updateSession(mockRequest);

    expect(supabaseResponse).toBeDefined();
  });

  it("cookies.getAll が呼ばれる", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      // cookies.getAll を呼んでテスト
      options.cookies.getAll?.();
      return { auth: { getUser: mockGetUser } } as ReturnType<
        typeof createServerClient
      >;
    });

    const { updateSession } = await import("@/lib/supabase/middleware");

    const mockGetAll = vi.fn(() => [{ name: "test", value: "cookie" }]);
    const mockRequest = {
      cookies: {
        getAll: mockGetAll,
        set: vi.fn(),
      },
    } as Parameters<typeof updateSession>[0];

    await updateSession(mockRequest);

    expect(mockGetAll).toHaveBeenCalled();
  });
});
