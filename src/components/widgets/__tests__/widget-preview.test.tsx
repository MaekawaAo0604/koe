import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { WidgetPreview, PREVIEW_MOCK_TESTIMONIALS } from "../widget-preview";
import type { WidgetConfig, TestimonialPublic } from "@/types/index";

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

const SAMPLE_TESTIMONIALS: TestimonialPublic[] = [
  {
    id: "t-1",
    author_name: "テスト ユーザー",
    author_title: "CEO",
    author_company: "テスト株式会社",
    author_avatar_url: null,
    rating: 5,
    content: "素晴らしいサービスです",
    created_at: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "t-2",
    author_name: "別のユーザー",
    author_title: null,
    author_company: null,
    author_avatar_url: null,
    rating: 4,
    content: "とても良いです",
    created_at: "2024-01-10T00:00:00.000Z",
  },
];

describe("WidgetPreview", () => {
  describe("基本レンダリング", () => {
    it("data-testid='widget-preview' の要素が表示される", () => {
      render(
        <WidgetPreview
          type="wall"
          config={DEFAULT_CONFIG}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      expect(screen.getByTestId("widget-preview")).toBeInTheDocument();
    });

    it("テスティモニアルのコンテンツが表示される", () => {
      render(
        <WidgetPreview
          type="wall"
          config={DEFAULT_CONFIG}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      expect(screen.getByText(/素晴らしいサービスです/)).toBeInTheDocument();
      expect(screen.getByText(/とても良いです/)).toBeInTheDocument();
    });

    it("投稿者名が表示される", () => {
      render(
        <WidgetPreview
          type="wall"
          config={DEFAULT_CONFIG}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      expect(screen.getByText("テスト ユーザー")).toBeInTheDocument();
    });
  });

  describe("ウィジェットタイプ", () => {
    it("wall タイプのとき「Wall of Love プレビュー」と表示される", () => {
      render(
        <WidgetPreview
          type="wall"
          config={DEFAULT_CONFIG}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      expect(screen.getByText(/Wall of Love プレビュー/)).toBeInTheDocument();
    });

    it("carousel タイプのとき「カルーセル プレビュー」と表示される", () => {
      render(
        <WidgetPreview
          type="carousel"
          config={DEFAULT_CONFIG}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      expect(screen.getByText(/カルーセル プレビュー/)).toBeInTheDocument();
    });

    it("list タイプのとき「リスト プレビュー」と表示される", () => {
      render(
        <WidgetPreview
          type="list"
          config={DEFAULT_CONFIG}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      expect(screen.getByText(/リスト プレビュー/)).toBeInTheDocument();
    });
  });

  describe("テスティモニアルがない場合", () => {
    it("空の配列のとき、サンプルデータが表示される", () => {
      render(
        <WidgetPreview
          type="wall"
          config={DEFAULT_CONFIG}
          testimonials={[]}
        />
      );
      expect(screen.getByText(/サンプルデータ/)).toBeInTheDocument();
    });

    it("空の配列のとき、モックデータのコンテンツが表示される", () => {
      render(
        <WidgetPreview
          type="wall"
          config={DEFAULT_CONFIG}
          testimonials={[]}
        />
      );
      // PREVIEW_MOCK_TESTIMONIALS の最初の author_name が表示される
      expect(
        screen.getByText(PREVIEW_MOCK_TESTIMONIALS[0].author_name)
      ).toBeInTheDocument();
    });
  });

  describe("max_items 制限", () => {
    it("max_items=1 のとき最大1件しか表示されない（wall）", () => {
      render(
        <WidgetPreview
          type="wall"
          config={{ ...DEFAULT_CONFIG, max_items: 1 }}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      // 1件のみ表示
      expect(screen.getByText(/素晴らしいサービスです/)).toBeInTheDocument();
      expect(screen.queryByText(/とても良いです/)).not.toBeInTheDocument();
    });
  });

  describe("テーマ", () => {
    it("light テーマのとき bg-gray-50 クラスが適用される", () => {
      render(
        <WidgetPreview
          type="wall"
          config={{ ...DEFAULT_CONFIG, theme: "light" }}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      const preview = screen.getByTestId("widget-preview");
      expect(preview.className).toContain("bg-gray-50");
    });

    it("dark テーマのとき bg-gray-950 クラスが適用される", () => {
      render(
        <WidgetPreview
          type="wall"
          config={{ ...DEFAULT_CONFIG, theme: "dark" }}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      const preview = screen.getByTestId("widget-preview");
      expect(preview.className).toContain("bg-gray-950");
    });
  });

  describe("表示設定", () => {
    it("show_date=true のとき日付が表示される", () => {
      render(
        <WidgetPreview
          type="wall"
          config={{ ...DEFAULT_CONFIG, show_date: true }}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      // 2024年の日付が少なくとも1件表示される
      const dateEls = screen.getAllByText(/2024/);
      expect(dateEls.length).toBeGreaterThan(0);
    });

    it("show_date=false のとき日付が表示されない", () => {
      render(
        <WidgetPreview
          type="wall"
          config={{ ...DEFAULT_CONFIG, show_date: false }}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      expect(screen.queryByText(/2024\/1\/15/)).not.toBeInTheDocument();
    });
  });

  describe("カルーセル", () => {
    it("carousel タイプのとき最初の1件のみ表示される", () => {
      render(
        <WidgetPreview
          type="carousel"
          config={DEFAULT_CONFIG}
          testimonials={SAMPLE_TESTIMONIALS}
        />
      );
      // 最初のテスティモニアルが表示される
      expect(screen.getByText(/素晴らしいサービスです/)).toBeInTheDocument();
      // 2件目は表示されない
      expect(screen.queryByText(/とても良いです/)).not.toBeInTheDocument();
    });
  });
});
