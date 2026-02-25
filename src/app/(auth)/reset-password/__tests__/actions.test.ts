import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("updatePassword", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("パスワードが空の場合はエラーを返す", async () => {
    const { updatePassword } = await import("../actions");
    const formData = new FormData();
    formData.set("password", "");
    formData.set("confirmPassword", "");

    const result = await updatePassword({ error: null }, formData);
    expect(result.error).toBe("すべての項目を入力してください");
  });

  it("パスワードが一致しない場合はエラーを返す", async () => {
    const { updatePassword } = await import("../actions");
    const formData = new FormData();
    formData.set("password", "password123");
    formData.set("confirmPassword", "different456");

    const result = await updatePassword({ error: null }, formData);
    expect(result.error).toBe("パスワードが一致しません");
  });

  it("パスワードが8文字未満の場合はエラーを返す", async () => {
    const { updatePassword } = await import("../actions");
    const formData = new FormData();
    formData.set("password", "short");
    formData.set("confirmPassword", "short");

    const result = await updatePassword({ error: null }, formData);
    expect(result.error).toBe("パスワードは8文字以上で入力してください");
  });

  it("更新成功時は redirect を呼ぶ", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        updateUser: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never);

    const { redirect } = await import("next/navigation");
    const { updatePassword } = await import("../actions");
    const formData = new FormData();
    formData.set("password", "newpassword123");
    formData.set("confirmPassword", "newpassword123");

    await updatePassword({ error: null }, formData);
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("更新失敗時はエラーを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        updateUser: vi.fn().mockResolvedValue({
          error: { message: "Update failed" },
        }),
      },
    } as never);

    const { updatePassword } = await import("../actions");
    const formData = new FormData();
    formData.set("password", "newpassword123");
    formData.set("confirmPassword", "newpassword123");

    const result = await updatePassword({ error: null }, formData);
    expect(result.error).toBe("パスワードの更新に失敗しました。もう一度お試しください。");
  });
});
