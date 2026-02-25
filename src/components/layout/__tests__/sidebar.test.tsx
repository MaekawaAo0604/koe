import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { Sidebar } from "../sidebar";

// next/navigation のモック
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Supabase クライアントのモック
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  }),
}));

describe("Sidebar", () => {
  it("Koe ブランドが表示される", () => {
    render(<Sidebar />);
    expect(screen.getByText("Koe")).toBeInTheDocument();
  });

  it("ダッシュボードナビゲーションリンクが表示される", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("link", { name: /ダッシュボード/ })
    ).toBeInTheDocument();
  });

  it("課金管理ナビゲーションリンクが表示される", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("link", { name: /課金管理/ })
    ).toBeInTheDocument();
  });

  it("ログアウトボタンが表示される", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("button", { name: "ログアウト" })
    ).toBeInTheDocument();
  });

  it("現在のページ（/dashboard）がアクティブ状態になる", () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByRole("link", { name: /ダッシュボード/ });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });

  it("現在のページでないリンクは aria-current を持たない", () => {
    render(<Sidebar />);
    const billingLink = screen.getByRole("link", { name: /課金管理/ });
    expect(billingLink).not.toHaveAttribute("aria-current");
  });

  it("メインナビゲーションランドマークが存在する", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("navigation", { name: "メインナビゲーション" })
    ).toBeInTheDocument();
  });
});
