import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { TestimonialCard } from "../testimonial-card";
import type { Testimonial } from "@/types/index";

const mockTestimonial: Testimonial = {
  id: "test-1",
  project_id: "project-1",
  status: "pending",
  author_name: "山田 太郎",
  author_title: "マネージャー",
  author_company: "株式会社テスト",
  author_email: "yamada@example.com",
  author_avatar_url: null,
  rating: 5,
  content: "素晴らしいサービスです",
  tags: ["良い", "おすすめ"],
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
};

describe("TestimonialCard", () => {
  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnUpdate.mockClear();
    mockOnDelete.mockClear();
    global.fetch = vi.fn();
  });

  it("テスティモニアルの内容が表示される", () => {
    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("testimonial-content")).toHaveTextContent(
      "素晴らしいサービスです"
    );
  });

  it("投稿者名が表示される", () => {
    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("author-name")).toHaveTextContent("山田 太郎");
  });

  it("author_email が表示される（管理画面のみ AC-9）", () => {
    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("author-email")).toHaveTextContent(
      "yamada@example.com"
    );
  });

  it("author_email が null のとき表示されない", () => {
    render(
      <TestimonialCard
        testimonial={{ ...mockTestimonial, author_email: null }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.queryByTestId("author-email")).not.toBeInTheDocument();
  });

  it("ステータスバッジが表示される（pending = 未審査）", () => {
    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("status-badge")).toHaveTextContent("未審査");
  });

  it("承認済みのとき承認ボタンが表示されない", () => {
    render(
      <TestimonialCard
        testimonial={{ ...mockTestimonial, status: "approved" }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.queryByLabelText("承認する")).not.toBeInTheDocument();
  });

  it("タグが表示される", () => {
    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    const tagBadges = screen.getAllByTestId("tag-badge");
    expect(tagBadges).toHaveLength(2);
    expect(tagBadges[0]).toHaveTextContent("良い");
    expect(tagBadges[1]).toHaveTextContent("おすすめ");
  });

  it("承認ボタンクリックでAPIが呼ばれる", async () => {
    const updatedTestimonial = { ...mockTestimonial, status: "approved" as const };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedTestimonial,
    });

    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByLabelText("承認する"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/testimonials/${mockTestimonial.id}`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "approved" }),
        })
      );
      expect(mockOnUpdate).toHaveBeenCalledWith(updatedTestimonial);
    });
  });

  it("削除ボタンクリックで確認ダイアログが開く", () => {
    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByLabelText("削除する"));
    expect(
      screen.getByText("テスティモニアルを削除しますか？")
    ).toBeInTheDocument();
  });

  it("削除確認後にAPIが呼ばれる", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    });

    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByLabelText("削除する"));
    fireEvent.click(screen.getByText("削除する"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/testimonials/${mockTestimonial.id}`,
        expect.objectContaining({ method: "DELETE" })
      );
      expect(mockOnDelete).toHaveBeenCalledWith(mockTestimonial.id);
    });
  });

  it("星評価が正しく表示される", () => {
    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("star-rating")).toHaveAccessibleName(
      "評価: 5星"
    );
  });

  it("投稿日時が表示される", () => {
    render(
      <TestimonialCard
        testimonial={mockTestimonial}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("created-date")).toBeInTheDocument();
  });
});
