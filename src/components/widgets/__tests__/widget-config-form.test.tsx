import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { WidgetConfigForm } from "../widget-config-form";
import type { WidgetConfig } from "@/types/index";

// fetch モック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// sonner モック
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Select コンポーネントは radix-ui の portal を使うため、jsdom 環境で部分モック
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="select" data-value={value}>
      <button
        onClick={() => onValueChange(value === "light" ? "dark" : "light")}
        data-testid="select-trigger"
      >
        {value}
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <div data-value={value}>{children}</div>,
}));

const DEFAULT_CONFIG: WidgetConfig = {
  theme: "light",
  show_rating: true,
  show_date: true,
  show_avatar: true,
  max_items: 10,
  columns: 3,
  border_radius: 8,
  shadow: true,
  font_family: "inherit",
};

describe("WidgetConfigForm", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "widget-1", type: "wall", config: DEFAULT_CONFIG }),
    });
  });

  describe("Freeプランの制限", () => {
    it("Freeプランのとき carousel と list ボタンが無効になる", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="free"
          onChange={mockOnChange}
        />
      );
      const carouselBtn = screen.getByTestId("widget-type-carousel");
      const listBtn = screen.getByTestId("widget-type-list");
      expect(carouselBtn).toBeDisabled();
      expect(listBtn).toBeDisabled();
    });

    it("Freeプランのとき wall ボタンは有効", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="free"
          onChange={mockOnChange}
        />
      );
      const wallBtn = screen.getByTestId("widget-type-wall");
      expect(wallBtn).not.toBeDisabled();
    });

    it("Freeプランのとき制限メッセージが表示される", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="free"
          onChange={mockOnChange}
        />
      );
      expect(
        screen.getByText(/Freeプランは Wall of Love のみ利用できます/)
      ).toBeInTheDocument();
    });

    it("Proプランのとき全タイプが有効", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="pro"
          onChange={mockOnChange}
        />
      );
      expect(screen.getByTestId("widget-type-wall")).not.toBeDisabled();
      expect(screen.getByTestId("widget-type-carousel")).not.toBeDisabled();
      expect(screen.getByTestId("widget-type-list")).not.toBeDisabled();
    });

    it("Proプランのとき Pro バッジが表示されない", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="pro"
          onChange={mockOnChange}
        />
      );
      // Pro バッジが表示されないことを確認
      expect(screen.queryByText("Pro")).not.toBeInTheDocument();
    });
  });

  describe("タイプ変更", () => {
    it("wallタイプボタンをクリックするとonChangeが呼ばれる", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="carousel"
          config={DEFAULT_CONFIG}
          plan="pro"
          onChange={mockOnChange}
        />
      );
      fireEvent.click(screen.getByTestId("widget-type-wall"));
      expect(mockOnChange).toHaveBeenCalledWith("wall", DEFAULT_CONFIG);
    });

    it("carouselタイプボタンをクリックするとonChangeが呼ばれる（Proのみ）", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="pro"
          onChange={mockOnChange}
        />
      );
      fireEvent.click(screen.getByTestId("widget-type-carousel"));
      expect(mockOnChange).toHaveBeenCalledWith("carousel", DEFAULT_CONFIG);
    });
  });

  describe("デザイン設定", () => {
    it("表示件数の入力が機能する", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="free"
          onChange={mockOnChange}
        />
      );
      const input = screen.getByTestId("input-max-items");
      fireEvent.change(input, { target: { value: "5" } });
      expect(mockOnChange).toHaveBeenCalledWith("wall", {
        ...DEFAULT_CONFIG,
        max_items: 5,
      });
    });

    it("角丸スライダーが機能する", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="free"
          onChange={mockOnChange}
        />
      );
      const slider = screen.getByTestId("range-border-radius");
      fireEvent.change(slider, { target: { value: "12" } });
      expect(mockOnChange).toHaveBeenCalledWith("wall", {
        ...DEFAULT_CONFIG,
        border_radius: 12,
      });
    });

    it("show_rating チェックボックスが機能する", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="free"
          onChange={mockOnChange}
        />
      );
      const checkbox = screen.getByTestId("checkbox-show_rating");
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith("wall", {
        ...DEFAULT_CONFIG,
        show_rating: false,
      });
    });

    it("shadow チェックボックスが機能する", () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="free"
          onChange={mockOnChange}
        />
      );
      const checkbox = screen.getByTestId("checkbox-shadow");
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith("wall", {
        ...DEFAULT_CONFIG,
        shadow: false,
      });
    });
  });

  describe("保存", () => {
    it("保存ボタンをクリックすると PATCH リクエストが送信される", async () => {
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="free"
          onChange={mockOnChange}
        />
      );
      fireEvent.click(screen.getByTestId("save-widget"));
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/widgets/w-1",
          expect.objectContaining({
            method: "PATCH",
          })
        );
      });
    });

    it("保存中は「保存中...」と表示される", async () => {
      // フェッチを遅延させる
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );
      render(
        <WidgetConfigForm
          widgetId="w-1"
          type="wall"
          config={DEFAULT_CONFIG}
          plan="free"
          onChange={mockOnChange}
        />
      );
      fireEvent.click(screen.getByTestId("save-widget"));
      expect(screen.getByText("保存中...")).toBeInTheDocument();
    });
  });
});
