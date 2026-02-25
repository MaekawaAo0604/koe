import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import NotFound from "../not-found";

describe("NotFound（404ページ）", () => {
  it("404と表示される", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("「ページが見つかりません」の見出しが表示される", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: "ページが見つかりません" })
    ).toBeInTheDocument();
  });

  it("説明文が表示される", () => {
    render(<NotFound />);
    expect(
      screen.getByText(/お探しのページは存在しないか/)
    ).toBeInTheDocument();
  });

  it("「ホームへ戻る」リンクが / に設定されている", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: "ホームへ戻る" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("「ダッシュボードへ」リンクが /dashboard に設定されている", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: "ダッシュボードへ" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
