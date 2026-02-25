import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import HomePage from "../page";

describe("HomePage（LP ページ）", () => {
  it("メインコンテンツが表示される", () => {
    render(<HomePage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("ヒーローセクションのタイトルが表示される", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("「無料で始める」CTAボタンが存在する（要件8 AC-2）", () => {
    render(<HomePage />);
    const ctaLinks = screen.getAllByRole("link", { name: "無料で始める" });
    // ヒーロー、Proプラン、ボトムCTAの3箇所に存在
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("ヒーローCTAが /register へのリンクになっている（要件8 AC-2）", () => {
    render(<HomePage />);
    const heroCta = screen.getByTestId("hero-cta");
    expect(heroCta).toHaveAttribute("href", "/register");
  });

  it("Proプランの「無料で始める」が /register へのリンクになっている（要件8 AC-2）", () => {
    render(<HomePage />);
    const proCta = screen.getByTestId("pricing-pro-cta");
    expect(proCta).toHaveAttribute("href", "/register");
  });

  it("ボトムCTAが /register へのリンクになっている（要件8 AC-2）", () => {
    render(<HomePage />);
    const bottomCta = screen.getByTestId("bottom-cta");
    expect(bottomCta).toHaveAttribute("href", "/register");
  });

  describe("サービス説明（要件8 AC-1）", () => {
    it("機能紹介のステップが3つ表示される", () => {
      render(<HomePage />);
      const cards = screen.getAllByTestId(/^feature-card-/);
      expect(cards).toHaveLength(3);
    });

    it("フォームURL共有の説明が表示される", () => {
      render(<HomePage />);
      expect(screen.getByText("フォームURL共有で自動収集")).toBeInTheDocument();
    });

    it("scriptタグ埋め込みの説明が表示される", () => {
      render(<HomePage />);
      expect(screen.getByText("scriptタグ1行で埋め込み")).toBeInTheDocument();
    });
  });

  describe("デモ Wall of Love（要件8 AC-1）", () => {
    it("デモテスティモニアルカードが表示される", () => {
      render(<HomePage />);
      const cards = screen.getAllByTestId(/^testimonial-card-/);
      expect(cards.length).toBeGreaterThan(0);
    });

    it("テスティモニアルの著者名が表示される", () => {
      render(<HomePage />);
      expect(screen.getByText("田中 太郎")).toBeInTheDocument();
    });
  });

  describe("料金プラン比較（要件8 AC-1, AC-3）", () => {
    it("Freeプランセクションが表示される", () => {
      render(<HomePage />);
      expect(screen.getByTestId("pricing-free")).toBeInTheDocument();
    });

    it("Proプランセクションが表示される", () => {
      render(<HomePage />);
      expect(screen.getByTestId("pricing-pro")).toBeInTheDocument();
    });

    it("Freeプランの価格が表示される（要件8 AC-3）", () => {
      render(<HomePage />);
      expect(screen.getByText("¥0")).toBeInTheDocument();
    });

    it("Proプランの価格 ¥980/月 が表示される（要件8 AC-3）", () => {
      render(<HomePage />);
      expect(screen.getByText("¥980")).toBeInTheDocument();
    });

    it("機能比較表が表示される（要件8 AC-3）", () => {
      render(<HomePage />);
      expect(screen.getByTestId("feature-comparison-table")).toBeInTheDocument();
    });

    it("機能比較表にFree/Proの列ヘッダーが表示される（要件8 AC-3）", () => {
      render(<HomePage />);
      expect(screen.getByRole("columnheader", { name: "Free" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Pro" })).toBeInTheDocument();
    });

    it("Proプランの「テスティモニアル無制限」が比較表に表示される（要件8 AC-3）", () => {
      render(<HomePage />);
      expect(screen.getByText("テスティモニアル無制限")).toBeInTheDocument();
    });
  });

  describe("ナビゲーション", () => {
    it("ログインリンクが存在する", () => {
      render(<HomePage />);
      const loginLinks = screen.getAllByRole("link", { name: "ログイン" });
      expect(loginLinks.length).toBeGreaterThan(0);
      expect(loginLinks[0]).toHaveAttribute("href", "/login");
    });
  });
});
