import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { CopyButton } from "../copy-button";

// navigator.clipboard のモック
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

describe("CopyButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("初期表示", () => {
    it("デフォルトラベル「コピー」が表示される", () => {
      render(<CopyButton text="test" />);
      expect(screen.getByRole("button", { name: "コピー" })).toBeInTheDocument();
    });

    it("label prop で表示テキストを変更できる", () => {
      render(<CopyButton text="test" label="URLをコピー" />);
      expect(
        screen.getByRole("button", { name: "URLをコピー" })
      ).toBeInTheDocument();
    });

    it("ボタンタイプが button である", () => {
      render(<CopyButton text="test" />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });
  });

  describe("コピー動作", () => {
    it("クリックで navigator.clipboard.writeText が呼ばれる", async () => {
      render(<CopyButton text="https://example.com/f/my-project" />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockWriteText).toHaveBeenCalledWith(
        "https://example.com/f/my-project"
      );
    });

    it("コピー後に「コピーしました」と表示される", async () => {
      render(<CopyButton text="test" />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      expect(
        screen.getByRole("button", { name: "コピーしました" })
      ).toBeInTheDocument();
    });

    it("2秒後に元のラベルに戻る", async () => {
      render(<CopyButton text="test" label="コピー" />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      expect(
        screen.getByRole("button", { name: "コピーしました" })
      ).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(
        screen.getByRole("button", { name: "コピー" })
      ).toBeInTheDocument();
    });

    it("2秒未満では「コピーしました」が表示されたまま", async () => {
      render(<CopyButton text="test" />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      await act(async () => {
        vi.advanceTimersByTime(1999);
      });

      expect(
        screen.getByRole("button", { name: "コピーしました" })
      ).toBeInTheDocument();
    });
  });

  describe("クリップボードAPI非対応時", () => {
    it("writeText が reject してもクラッシュしない", async () => {
      mockWriteText.mockRejectedValueOnce(new Error("Not allowed"));

      render(<CopyButton text="test" />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      // クラッシュせず初期ラベルのまま
      expect(screen.getByRole("button", { name: "コピー" })).toBeInTheDocument();
    });
  });
});
