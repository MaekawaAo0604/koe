import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { RegisterForm } from "../register-form";

// actions のモック
vi.mock("@/app/(auth)/register/actions", () => ({
  signUpWithEmail: vi.fn(),
}));

describe("RegisterForm", () => {
  it("名前・メールアドレス・パスワードの入力フィールドが表示される", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("お名前")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
  });

  it("登録ボタンが表示される", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("button", { name: "無料で始める" })).toBeInTheDocument();
  });

  it("パスワードフィールドは password 型である", () => {
    render(<RegisterForm />);
    const passwordInput = screen.getByLabelText("パスワード");
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("パスワードフィールドは minLength=8 が設定されている", () => {
    render(<RegisterForm />);
    const passwordInput = screen.getByLabelText("パスワード");
    expect(passwordInput).toHaveAttribute("minLength", "8");
  });
});
