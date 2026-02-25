import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import Loading from "../loading";

describe("Loading（ローディングページ）", () => {
  it("ローディングのステータスロールが存在する", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("「読み込み中」のアクセシブルなラベルが設定されている", () => {
    render(<Loading />);
    expect(screen.getByLabelText("読み込み中")).toBeInTheDocument();
  });

  it("「読み込み中...」のテキストが表示される", () => {
    render(<Loading />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });
});
