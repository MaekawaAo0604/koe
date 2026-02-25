import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { UsageIndicator } from "../usage-indicator";

describe("UsageIndicator", () => {
  it("Freeプランのとき件数と上限が表示される", () => {
    render(<UsageIndicator current={3} plan="free" />);
    expect(screen.getByTestId("usage-count")).toHaveTextContent("3 / 10 件");
  });

  it("Proプランのときは何も表示されない", () => {
    const { container } = render(<UsageIndicator current={3} plan="pro" />);
    expect(container.firstChild).toBeNull();
  });

  it("上限（10件）に達したとき上限メッセージが表示される", () => {
    render(<UsageIndicator current={10} plan="free" />);
    expect(screen.getByText(/上限に達しました/)).toBeInTheDocument();
  });

  it("80%以上（8件）でまもなく上限メッセージが表示される", () => {
    render(<UsageIndicator current={8} plan="free" />);
    expect(screen.getByText(/まもなく上限に達します/)).toBeInTheDocument();
  });

  it("80%未満（3件）でメッセージは表示されない", () => {
    render(<UsageIndicator current={3} plan="free" />);
    expect(screen.queryByText(/上限に達しました/)).not.toBeInTheDocument();
    expect(screen.queryByText(/まもなく上限に達します/)).not.toBeInTheDocument();
  });

  it("0件のとき 0 / 10 件と表示される", () => {
    render(<UsageIndicator current={0} plan="free" />);
    expect(screen.getByTestId("usage-count")).toHaveTextContent("0 / 10 件");
  });
});
