import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { Input } from "../input";

describe("Input", () => {
  it("input 要素を表示する", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("placeholder を表示する", () => {
    render(<Input placeholder="入力してください" />);
    expect(screen.getByPlaceholderText("入力してください")).toBeInTheDocument();
  });

  it("値の入力を受け付ける", async () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "テスト入力");
    expect(input).toHaveValue("テスト入力");
  });

  it("onChange ハンドラが呼ばれる", async () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    await userEvent.type(screen.getByRole("textbox"), "a");
    expect(handleChange).toHaveBeenCalled();
  });

  it("disabled 時は入力不可", () => {
    render(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("type='email' が適用される", () => {
    render(<Input type="email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("カスタムクラスが適用される", () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole("textbox")).toHaveClass("custom-input");
  });
});
