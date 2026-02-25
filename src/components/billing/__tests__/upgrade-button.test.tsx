import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { UpgradeButton } from "../upgrade-button";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("UpgradeButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    delete (window as Window & { location?: Location }).location;
    (window as Window & { location?: { href: string } }).location = { href: "" };
  });

  it("ボタンが表示される", () => {
    render(<UpgradeButton />);
    expect(screen.getByTestId("upgrade-button")).toBeInTheDocument();
    expect(screen.getByTestId("upgrade-button")).toHaveTextContent("Proにアップグレード");
  });

  it("disabled=true のとき無効化される", () => {
    render(<UpgradeButton disabled />);
    expect(screen.getByTestId("upgrade-button")).toBeDisabled();
  });

  it("クリック後にAPIが呼ばれる", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/c/pay/cs_xxx" }),
    });

    render(<UpgradeButton />);
    fireEvent.click(screen.getByTestId("upgrade-button"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/billing/checkout", {
        method: "POST",
      });
    });
  });

  it("APIが成功した場合にCheckoutページへリダイレクトされる", async () => {
    const mockUrl = "https://checkout.stripe.com/c/pay/cs_xxx";
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: mockUrl }),
    });

    render(<UpgradeButton />);
    fireEvent.click(screen.getByTestId("upgrade-button"));

    await waitFor(() => {
      expect((window.location as { href: string }).href).toBe(mockUrl);
    });
  });

  it("APIがエラーを返した場合にトーストエラーが表示される", async () => {
    const { toast } = await import("sonner");
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Already subscribed to Pro plan" }),
    });

    render(<UpgradeButton />);
    fireEvent.click(screen.getByTestId("upgrade-button"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Already subscribed to Pro plan");
    });
  });

  it("ネットワークエラー時にトーストエラーが表示される", async () => {
    const { toast } = await import("sonner");
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<UpgradeButton />);
    fireEvent.click(screen.getByTestId("upgrade-button"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("通信エラーが発生しました");
    });
  });
});
