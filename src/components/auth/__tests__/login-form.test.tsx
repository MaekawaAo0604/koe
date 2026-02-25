import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { LoginForm } from "../login-form";

// next/navigation のモック
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// actions のモック
vi.mock("@/app/(auth)/login/actions", () => ({
  signInWithEmail: vi.fn(),
}));

describe("LoginForm", () => {
  it("メールアドレスとパスワードの入力フィールドが表示される", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
  });

  it("ログインボタンが表示される", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("メールアドレスフィールドは email 型である", () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText("メールアドレス");
    expect(emailInput).toHaveAttribute("type", "email");
  });

  it("パスワードフィールドは password 型である", () => {
    render(<LoginForm />);
    const passwordInput = screen.getByLabelText("パスワード");
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
