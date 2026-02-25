import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { Header } from "../header";

describe("Header", () => {
  it("ユーザー名が表示される", () => {
    render(<Header userName="test@example.com" />);
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("'ようこそ、' テキストが表示される", () => {
    render(<Header userName="田中" />);
    expect(screen.getByText("ようこそ、")).toBeInTheDocument();
  });

  it("指定したユーザー名が表示される", () => {
    render(<Header userName="田中太郎" />);
    expect(screen.getByText("田中太郎")).toBeInTheDocument();
  });

  it("header ランドマーク要素が存在する", () => {
    render(<Header userName="test" />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});
