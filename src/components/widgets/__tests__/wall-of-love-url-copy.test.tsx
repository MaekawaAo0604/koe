import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { WallOfLoveUrlCopy } from "../wall-of-love-url-copy";

// CopyButtonのモック
vi.mock("@/components/shared/copy-button", () => ({
  CopyButton: ({ text, label }: { text: string; label: string }) => (
    <button data-testid="copy-button" data-copy-text={text}>
      {label}
    </button>
  ),
}));

describe("WallOfLoveUrlCopy", () => {
  const slug = "my-project";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("レンダリング", () => {
    it("タイトルと説明が表示される", () => {
      render(<WallOfLoveUrlCopy slug={slug} />);
      expect(screen.getByText("Wall of Love 公開ページ")).toBeInTheDocument();
      expect(
        screen.getByText(/承認済みテスティモニアルをまとめた/)
      ).toBeInTheDocument();
    });

    it("Wall of Love URLが表示される", () => {
      render(<WallOfLoveUrlCopy slug={slug} />);
      const codeEl = screen.getByTestId("wall-url");
      expect(codeEl.textContent).toContain(`/wall/${slug}`);
    });

    it("URLにslugが含まれる", () => {
      render(<WallOfLoveUrlCopy slug="test-slug" />);
      const codeEl = screen.getByTestId("wall-url");
      expect(codeEl.textContent).toContain("test-slug");
    });

    it("コピーボタンが表示される", () => {
      render(<WallOfLoveUrlCopy slug={slug} />);
      expect(screen.getByTestId("copy-button")).toBeInTheDocument();
      expect(screen.getByText("URLをコピー")).toBeInTheDocument();
    });

    it("コピーボタンに正しいURLが渡される", () => {
      render(<WallOfLoveUrlCopy slug={slug} />);
      const copyBtn = screen.getByTestId("copy-button");
      const copyText = copyBtn.getAttribute("data-copy-text") ?? "";
      expect(copyText).toContain(`/wall/${slug}`);
    });
  });

  describe("異なるslug", () => {
    it("異なるslugで正しいURLが生成される", () => {
      render(<WallOfLoveUrlCopy slug="another-project" />);
      const codeEl = screen.getByTestId("wall-url");
      expect(codeEl.textContent).toContain("/wall/another-project");
    });
  });
});
