import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { PaymentStatusBanner } from "../payment-status-banner";
import type { SubscriptionStatus } from "@/types/index";

describe("PaymentStatusBanner", () => {
  it("past_due のときバナーが表示される（要件7 AC-13）", () => {
    render(<PaymentStatusBanner status="past_due" />);
    expect(screen.getByTestId("payment-status-banner")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "お支払いに問題が発生しています"
    );
  });

  it("active のときバナーが表示されない", () => {
    render(<PaymentStatusBanner status="active" />);
    expect(screen.queryByTestId("payment-status-banner")).not.toBeInTheDocument();
  });

  it("canceled のときバナーが表示されない", () => {
    render(<PaymentStatusBanner status="canceled" />);
    expect(screen.queryByTestId("payment-status-banner")).not.toBeInTheDocument();
  });

  it("deleted のときバナーが表示されない", () => {
    render(<PaymentStatusBanner status={"deleted" as SubscriptionStatus} />);
    expect(screen.queryByTestId("payment-status-banner")).not.toBeInTheDocument();
  });

  it("支払い方法の更新を促すメッセージが含まれる", () => {
    render(<PaymentStatusBanner status="past_due" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "支払い方法を更新してください"
    );
  });
});
