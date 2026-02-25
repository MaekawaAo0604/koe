import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import HomePage from "../page";

describe("HomePage", () => {
  it("Koeのタイトルが表示される", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Koe" })).toBeInTheDocument();
  });

  it("サービス説明文が表示される", () => {
    render(<HomePage />);
    expect(
      screen.getByText("顧客の声を収集・管理・公開するSaaSプラットフォーム")
    ).toBeInTheDocument();
  });

  it("mainタグがレンダリングされる", () => {
    render(<HomePage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
