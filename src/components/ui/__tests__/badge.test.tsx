import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { Badge } from "../badge";

describe("Badge", () => {
  it("テキストを表示する", () => {
    render(<Badge>Pro</Badge>);
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("variant='default' のスタイルが適用される", () => {
    const { container } = render(<Badge>デフォルト</Badge>);
    expect(container.firstChild).toHaveClass("bg-primary");
  });

  it("variant='secondary' のスタイルが適用される", () => {
    const { container } = render(<Badge variant="secondary">セカンダリ</Badge>);
    expect(container.firstChild).toHaveClass("bg-secondary");
  });

  it("variant='destructive' のスタイルが適用される", () => {
    const { container } = render(<Badge variant="destructive">エラー</Badge>);
    expect(container.firstChild).toHaveClass("bg-destructive");
  });

  it("variant='outline' のスタイルが適用される", () => {
    const { container } = render(<Badge variant="outline">アウトライン</Badge>);
    expect(container.firstChild).toHaveClass("text-foreground");
  });

  it("カスタムクラスが適用される", () => {
    const { container } = render(<Badge className="custom-badge">バッジ</Badge>);
    expect(container.firstChild).toHaveClass("custom-badge");
  });
});
