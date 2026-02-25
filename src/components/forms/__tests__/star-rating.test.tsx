import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StarRating } from "../star-rating";

describe("StarRating", () => {
  it("5つの星ボタンをレンダリングする", () => {
    render(<StarRating value={0} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });

  it("valueに応じて星が塗りつぶされる", () => {
    render(<StarRating value={3} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-label", "1星");
    expect(buttons[2]).toHaveAttribute("aria-label", "3星");
  });

  it("クリックでonChangeが呼ばれる", () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // 3星
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("readonlyモードではonChangeが呼ばれない", () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} readonly />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("エラーメッセージを表示する", () => {
    render(<StarRating value={0} onChange={vi.fn()} error="評価は必須です" />);
    expect(screen.getByRole("alert")).toHaveTextContent("評価は必須です");
  });

  it("readonlyモードではgroup roleをimgに変える", () => {
    render(<StarRating value={4} readonly />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
