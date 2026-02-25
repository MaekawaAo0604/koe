import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("signInWithEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("メールアドレスが空の場合はエラーを返す", async () => {
    const { signInWithEmail } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "");
    formData.set("password", "password123");

    const result = await signInWithEmail({ error: null }, formData);
    expect(result.error).toBe("メールアドレスとパスワードを入力してください");
  });

  it("パスワードが空の場合はエラーを返す", async () => {
    const { signInWithEmail } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "");

    const result = await signInWithEmail({ error: null }, formData);
    expect(result.error).toBe("メールアドレスとパスワードを入力してください");
  });

  it("認証エラー時はエラーメッセージを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { message: "Invalid login credentials" },
        }),
      },
    } as never);

    const { signInWithEmail } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "wrongpassword");

    const result = await signInWithEmail({ error: null }, formData);
    expect(result.error).toBe("メールアドレスまたはパスワードが正しくありません");
  });

  it("メール未確認エラーの場合は確認メッセージを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { message: "Email not confirmed" },
        }),
      },
    } as never);

    const { signInWithEmail } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "password123");

    const result = await signInWithEmail({ error: null }, formData);
    expect(result.error).toBe(
      "メールアドレスの確認が完了していません。確認メールをご確認ください"
    );
  });
});
