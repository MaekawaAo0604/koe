import { describe, it, expect, vi, beforeEach } from "vitest";

// @supabase/ssr のモック
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ type: "browser-client" })),
  createServerClient: vi.fn(() => ({ type: "server-client" })),
}));

// @supabase/supabase-js のモック
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ type: "service-role-client" })),
}));

// next/headers のモック
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

describe("lib/supabase/client.ts", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("createClient がブラウザ用クライアントを返す", async () => {
    const { createBrowserClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/client");

    const client = createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key"
    );
    expect(client).toEqual({ type: "browser-client" });
  });

  it("環境変数 NEXT_PUBLIC_SUPABASE_URL を使用する", async () => {
    const { createBrowserClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/client");

    createClient();

    const [url] = vi.mocked(createBrowserClient).mock.calls[0];
    expect(url).toBe("https://test.supabase.co");
  });

  it("環境変数 NEXT_PUBLIC_SUPABASE_ANON_KEY を使用する", async () => {
    const { createBrowserClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/client");

    createClient();

    const [, anonKey] = vi.mocked(createBrowserClient).mock.calls[0];
    expect(anonKey).toBe("test-anon-key");
  });
});

describe("lib/supabase/server.ts", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("createClient がサーバー用クライアントを返す", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/server");

    const client = await createClient();

    expect(createServerClient).toHaveBeenCalled();
    expect(client).toEqual({ type: "server-client" });
  });

  it("環境変数 NEXT_PUBLIC_SUPABASE_URL を使用する", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/server");

    await createClient();

    const [url] = vi.mocked(createServerClient).mock.calls[0];
    expect(url).toBe("https://test.supabase.co");
  });

  it("cookies オプションに getAll と setAll が含まれる", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/server");

    await createClient();

    const [, , options] = vi.mocked(createServerClient).mock.calls[0];
    expect(options.cookies).toBeDefined();
    expect(typeof options.cookies.getAll).toBe("function");
    expect(typeof options.cookies.setAll).toBe("function");
  });
});

describe("lib/supabase/service-role.ts", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("createServiceRoleClient が Service Role クライアントを返す", async () => {
    const { createClient: createSupabaseClient } = await import(
      "@supabase/supabase-js"
    );
    const { createServiceRoleClient } = await import(
      "@/lib/supabase/service-role"
    );

    const client = createServiceRoleClient();

    expect(createSupabaseClient).toHaveBeenCalled();
    expect(client).toEqual({ type: "service-role-client" });
  });

  it("SUPABASE_SERVICE_ROLE_KEY を使用する（NEXT_PUBLIC_ プレフィックスなし）", async () => {
    const { createClient: createSupabaseClient } = await import(
      "@supabase/supabase-js"
    );
    const { createServiceRoleClient } = await import(
      "@/lib/supabase/service-role"
    );

    createServiceRoleClient();

    const [, serviceKey] = vi.mocked(createSupabaseClient).mock.calls[0];
    expect(serviceKey).toBe("test-service-role-key");
  });

  it("autoRefreshToken: false, persistSession: false を設定する", async () => {
    const { createClient: createSupabaseClient } = await import(
      "@supabase/supabase-js"
    );
    const { createServiceRoleClient } = await import(
      "@/lib/supabase/service-role"
    );

    createServiceRoleClient();

    const [, , options] = vi.mocked(createSupabaseClient).mock.calls[0];
    expect(options?.auth?.autoRefreshToken).toBe(false);
    expect(options?.auth?.persistSession).toBe(false);
  });

  it("NEXT_PUBLIC_ プレフィックス付きのキーを使用しない", async () => {
    const { createClient: createSupabaseClient } = await import(
      "@supabase/supabase-js"
    );
    const { createServiceRoleClient } = await import(
      "@/lib/supabase/service-role"
    );

    createServiceRoleClient();

    const [, serviceKey] = vi.mocked(createSupabaseClient).mock.calls[0];
    // service_role キーはクライアントに露出させないため NEXT_PUBLIC_ を付けない
    expect(serviceKey).not.toContain("public");
  });
});
