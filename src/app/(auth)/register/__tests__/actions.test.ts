import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("http://localhost:3000"),
  }),
}));

describe("signUpWithEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("名前が空の場合はエラーを返す", async () => {
    const { signUpWithEmail } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "password123");
    formData.set("name", "");

    const result = await signUpWithEmail({ error: null, success: false }, formData);
    expect(result.error).toBe("すべての項目を入力してください");
    expect(result.success).toBe(false);
  });

  it("パスワードが8文字未満の場合はエラーを返す", async () => {
    const { signUpWithEmail } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "short");
    formData.set("name", "テストユーザー");

    const result = await signUpWithEmail({ error: null, success: false }, formData);
    expect(result.error).toBe("パスワードは8文字以上で入力してください");
    expect(result.success).toBe(false);
  });

  it("サインアップ成功時は success=true を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never);

    const { signUpWithEmail } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "password123");
    formData.set("name", "テストユーザー");

    const result = await signUpWithEmail({ error: null, success: false }, formData);
    expect(result.error).toBeNull();
    expect(result.success).toBe(true);
  });

  it("既存ユーザーの場合もセキュリティ上 success=true を返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          error: { message: "User already registered" },
        }),
      },
    } as never);

    const { signUpWithEmail } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "existing@example.com");
    formData.set("password", "password123");
    formData.set("name", "テストユーザー");

    const result = await signUpWithEmail({ error: null, success: false }, formData);
    expect(result.error).toBeNull();
    expect(result.success).toBe(true);
  });
});
