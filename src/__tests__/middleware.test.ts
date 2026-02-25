import { describe, it, expect, vi, beforeEach } from "vitest";

// updateSession のモック
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

// next/server のモック
vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({ type: "redirect", url })),
    next: vi.fn(() => ({ type: "next" })),
  },
}));

describe("src/middleware.ts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("未認証で /dashboard にアクセス → /login へリダイレクト（要件1 AC-8）", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");
    const { NextResponse } = await import("next/server");

    vi.mocked(updateSession).mockResolvedValue({
      user: null,
      supabaseResponse: { type: "supabase-response" } as never,
    });

    const { middleware } = await import("@/middleware");

    const clonedUrl = new URL("http://localhost/dashboard");
    const request = {
      nextUrl: {
        pathname: "/dashboard",
        clone: () => clonedUrl,
      },
    } as never;

    await middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/login" })
    );
  });

  it("未認証で /dashboard/projects にアクセス → /login へリダイレクト", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");
    const { NextResponse } = await import("next/server");

    vi.mocked(updateSession).mockResolvedValue({
      user: null,
      supabaseResponse: { type: "supabase-response" } as never,
    });

    const { middleware } = await import("@/middleware");

    const clonedUrl = new URL("http://localhost/dashboard/projects");
    const request = {
      nextUrl: {
        pathname: "/dashboard/projects",
        clone: () => clonedUrl,
      },
    } as never;

    await middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/login" })
    );
  });

  it("未認証で /dashboard/billing にアクセス → /login へリダイレクト", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");
    const { NextResponse } = await import("next/server");

    vi.mocked(updateSession).mockResolvedValue({
      user: null,
      supabaseResponse: { type: "supabase-response" } as never,
    });

    const { middleware } = await import("@/middleware");

    const clonedUrl = new URL("http://localhost/dashboard/billing");
    const request = {
      nextUrl: {
        pathname: "/dashboard/billing",
        clone: () => clonedUrl,
      },
    } as never;

    await middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/login" })
    );
  });

  it("認証済みで /dashboard にアクセス → リダイレクトしない", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");
    const { NextResponse } = await import("next/server");

    const mockSupa = { type: "supabase-response" };
    vi.mocked(updateSession).mockResolvedValue({
      user: { id: "user-123" } as never,
      supabaseResponse: mockSupa as never,
    });

    const { middleware } = await import("@/middleware");

    const request = {
      nextUrl: {
        pathname: "/dashboard",
        clone: vi.fn(),
      },
    } as never;

    const result = await middleware(request);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(result).toBe(mockSupa);
  });

  it("未認証で / にアクセス → リダイレクトしない（公開ページ）", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");
    const { NextResponse } = await import("next/server");

    const mockSupa = { type: "supabase-response" };
    vi.mocked(updateSession).mockResolvedValue({
      user: null,
      supabaseResponse: mockSupa as never,
    });

    const { middleware } = await import("@/middleware");

    const request = {
      nextUrl: {
        pathname: "/",
        clone: vi.fn(),
      },
    } as never;

    const result = await middleware(request);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(result).toBe(mockSupa);
  });

  it("未認証で /login にアクセス → リダイレクトしない", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");
    const { NextResponse } = await import("next/server");

    const mockSupa = { type: "supabase-response" };
    vi.mocked(updateSession).mockResolvedValue({
      user: null,
      supabaseResponse: mockSupa as never,
    });

    const { middleware } = await import("@/middleware");

    const request = {
      nextUrl: {
        pathname: "/login",
        clone: vi.fn(),
      },
    } as never;

    const result = await middleware(request);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(result).toBe(mockSupa);
  });

  it("すべてのリクエストで updateSession が呼ばれる（要件1 AC-9: セッション自動維持）", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");

    vi.mocked(updateSession).mockResolvedValue({
      user: null,
      supabaseResponse: { type: "supabase-response" } as never,
    });

    const { middleware } = await import("@/middleware");

    const request = {
      nextUrl: {
        pathname: "/",
        clone: vi.fn(),
      },
    } as never;

    await middleware(request);

    expect(updateSession).toHaveBeenCalledWith(request);
  });

  it("middleware の matcher 設定が正しい（静的ファイル・widget.js 除外）", async () => {
    const { config } = await import("@/middleware");

    expect(config.matcher).toBeDefined();
    expect(config.matcher[0]).toContain("_next/static");
    expect(config.matcher[0]).toContain("_next/image");
    expect(config.matcher[0]).toContain("favicon.ico");
    expect(config.matcher[0]).toContain("widget.js");
  });
});
