import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("http://localhost:3000"),
  }),
}));

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("メールアドレスが空の場合はエラーを返す", async () => {
    const { requestPasswordReset } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "");

    const result = await requestPasswordReset({ error: null, success: false }, formData);
    expect(result.error).toBe("メールアドレスを入力してください");
    expect(result.success).toBe(false);
  });

  it("成功時は success=true を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never);

    const { requestPasswordReset } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");

    const result = await requestPasswordReset({ error: null, success: false }, formData);
    expect(result.error).toBeNull();
    expect(result.success).toBe(true);
  });

  it("未登録メールでも success=true を返す（セキュリティ対策）", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          error: { message: "User not found" },
        }),
      },
    } as never);

    const { requestPasswordReset } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "notfound@example.com");

    const result = await requestPasswordReset({ error: null, success: false }, formData);
    expect(result.error).toBeNull();
    expect(result.success).toBe(true);
  });
});
