import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { EmbedCodeCopy } from "../embed-code-copy";

// CopyButtonのモック
vi.mock("@/components/shared/copy-button", () => ({
  CopyButton: ({ text, label }: { text: string; label: string }) => (
    <button data-testid="copy-button" data-copy-text={text}>
      {label}
    </button>
  ),
}));

describe("EmbedCodeCopy", () => {
  const projectId = "project-123";
  const widgetId = "widget-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("レンダリング", () => {
    it("タイトルと説明が表示される", () => {
      render(<EmbedCodeCopy projectId={projectId} widgetId={widgetId} />);
      expect(screen.getByText("埋め込みコード")).toBeInTheDocument();
      expect(
        screen.getByText(/このコードをWebサイトのHTMLに貼り付けて/)
      ).toBeInTheDocument();
    });

    it("埋め込みコードが表示される", () => {
      render(<EmbedCodeCopy projectId={projectId} widgetId={widgetId} />);
      const codeEl = screen.getByTestId("embed-code");
      expect(codeEl.textContent).toContain("widget.js");
      expect(codeEl.textContent).toContain(`data-project="${projectId}"`);
      expect(codeEl.textContent).toContain(`data-widget="${widgetId}"`);
    });

    it("scriptタグ形式で埋め込みコードが生成される", () => {
      render(<EmbedCodeCopy projectId={projectId} widgetId={widgetId} />);
      const codeEl = screen.getByTestId("embed-code");
      expect(codeEl.textContent).toContain("<script");
      expect(codeEl.textContent).toContain("</script>");
    });

    it("コピーボタンが表示される", () => {
      render(<EmbedCodeCopy projectId={projectId} widgetId={widgetId} />);
      expect(screen.getByTestId("copy-button")).toBeInTheDocument();
      expect(screen.getByText("埋め込みコードをコピー")).toBeInTheDocument();
    });

    it("コピーボタンに正しいテキストが渡される", () => {
      render(<EmbedCodeCopy projectId={projectId} widgetId={widgetId} />);
      const copyBtn = screen.getByTestId("copy-button");
      const copyText = copyBtn.getAttribute("data-copy-text") ?? "";
      expect(copyText).toContain(`data-project="${projectId}"`);
      expect(copyText).toContain(`data-widget="${widgetId}"`);
    });
  });

  describe("異なるID", () => {
    it("異なるprojectIdとwidgetIdで正しいコードが生成される", () => {
      render(<EmbedCodeCopy projectId="abc-123" widgetId="xyz-789" />);
      const codeEl = screen.getByTestId("embed-code");
      expect(codeEl.textContent).toContain('data-project="abc-123"');
      expect(codeEl.textContent).toContain('data-widget="xyz-789"');
    });
  });
});
