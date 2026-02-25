import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { BillingContent } from "../billing-content";

// useSearchParams と useRouter のモック
const mockGet = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { plan: "free" } }),
        }),
      }),
    }),
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("BillingContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
    global.fetch = vi.fn();
  });

  it("Freeプランのとき両方のプランカードが表示される", () => {
    render(
      <BillingContent
        initialPlan="free"
        initialSubscription={null}
      />
    );
    expect(screen.getByTestId("plan-card-free")).toBeInTheDocument();
    expect(screen.getByTestId("plan-card-pro")).toBeInTheDocument();
  });

  it("Freeプランのときアップグレードボタンが表示される", () => {
    render(
      <BillingContent
        initialPlan="free"
        initialSubscription={null}
      />
    );
    expect(screen.getByTestId("upgrade-button")).toBeInTheDocument();
  });

  it("Proプランのとき「プランを管理」ボタンが表示される", () => {
    render(
      <BillingContent
        initialPlan="pro"
        initialSubscription={{
          status: "active",
          current_period_end: "2025-03-01T00:00:00Z",
        }}
      />
    );
    expect(screen.getByTestId("manage-button")).toBeInTheDocument();
    expect(screen.queryByTestId("upgrade-button")).not.toBeInTheDocument();
  });

  it("Proプランのとき次回請求日が表示される（要件7 AC-12）", () => {
    render(
      <BillingContent
        initialPlan="pro"
        initialSubscription={{
          status: "active",
          current_period_end: "2025-03-01T00:00:00Z",
        }}
      />
    );
    expect(screen.getByTestId("subscription-info")).toBeInTheDocument();
    expect(screen.getByTestId("next-billing-date")).toBeInTheDocument();
  });

  it("past_due のとき PaymentStatusBanner が表示される（要件7 AC-13）", () => {
    render(
      <BillingContent
        initialPlan="pro"
        initialSubscription={{
          status: "past_due",
          current_period_end: "2025-03-01T00:00:00Z",
        }}
      />
    );
    expect(screen.getByTestId("payment-status-banner")).toBeInTheDocument();
  });

  it("?canceled=true のときキャンセルメッセージが表示される", () => {
    mockGet.mockImplementation((key: string) => key === "canceled" ? "true" : null);
    render(
      <BillingContent
        initialPlan="free"
        initialSubscription={null}
      />
    );
    expect(screen.getByTestId("cancel-message")).toBeInTheDocument();
  });

  it("「プランを管理」ボタンクリックでポータルAPIが呼ばれる", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://billing.stripe.com/p/session/xxx" }),
    });

    delete (window as Window & { location?: Location }).location;
    (window as Window & { location?: { href: string } }).location = { href: "" };

    render(
      <BillingContent
        initialPlan="pro"
        initialSubscription={{
          status: "active",
          current_period_end: "2025-03-01T00:00:00Z",
        }}
      />
    );

    fireEvent.click(screen.getByTestId("manage-button"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/billing/portal", {
        method: "POST",
      });
    });
  });

  it("?success=true のときポーリングインジケーターが表示される（要件7 AC-3）", () => {
    mockGet.mockImplementation((key: string) => key === "success" ? "true" : null);
    render(
      <BillingContent
        initialPlan="free"
        initialSubscription={null}
      />
    );
    expect(screen.getByTestId("polling-indicator")).toBeInTheDocument();
  });
});
