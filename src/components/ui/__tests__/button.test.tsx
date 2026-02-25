import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { Button } from "../button";

describe("Button", () => {
  it("テキストを表示する", () => {
    render(<Button>クリック</Button>);
    expect(screen.getByRole("button", { name: "クリック" })).toBeInTheDocument();
  });

  it("クリックイベントを発火する", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>クリック</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disabled 時はクリックできない", async () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>クリック</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("variant='destructive' のスタイルが適用される", () => {
    render(<Button variant="destructive">削除</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");
  });

  it("variant='outline' のスタイルが適用される", () => {
    render(<Button variant="outline">アウトライン</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("border");
  });

  it("size='sm' のスタイルが適用される", () => {
    render(<Button size="sm">小さい</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-9");
  });

  it("size='lg' のスタイルが適用される", () => {
    render(<Button size="lg">大きい</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-11");
  });

  it("カスタムクラスが適用される", () => {
    render(<Button className="custom-class">ボタン</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });
});
