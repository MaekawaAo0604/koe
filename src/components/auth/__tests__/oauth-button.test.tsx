import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { OAuthButton } from "../oauth-button";

describe("OAuthButton", () => {
  const mockFormAction = vi.fn() as unknown as () => Promise<void>;

  it("Googleボタンが表示される", () => {
    render(<OAuthButton provider="google" formAction={mockFormAction} />);
    expect(screen.getByRole("button", { name: /Googleで続ける/i })).toBeInTheDocument();
  });

  it("ボタンはsubmitタイプである", () => {
    render(<OAuthButton provider="google" formAction={mockFormAction} />);
    const button = screen.getByRole("button", { name: /Googleで続ける/i });
    expect(button).toHaveAttribute("type", "submit");
  });

  it("formタグが存在する", () => {
    const { container } = render(<OAuthButton provider="google" formAction={mockFormAction} />);
    expect(container.querySelector("form")).toBeInTheDocument();
  });
});
