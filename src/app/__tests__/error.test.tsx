import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import ErrorPage from "../error";

describe("ErrorPage（500エラーページ）", () => {
  const mockError = Object.assign(new globalThis.Error("Test error"), { digest: undefined }) as Error & { digest?: string };
  const mockReset = vi.fn();

  it("500と表示される", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("「サーバーエラーが発生しました」の見出しが表示される", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByRole("heading", { name: "サーバーエラーが発生しました" })
    ).toBeInTheDocument();
  });

  it("説明文が表示される", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByText(/予期せぬエラーが発生しました/)
    ).toBeInTheDocument();
  });

  it("「もう一度試す」ボタンをクリックすると reset が呼ばれる", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const button = screen.getByRole("button", { name: "もう一度試す" });
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("「ホームへ戻る」リンクが / に設定されている", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const link = screen.getByRole("link", { name: "ホームへ戻る" });
    expect(link).toHaveAttribute("href", "/");
  });
});
