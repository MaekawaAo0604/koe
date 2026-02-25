import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { TestimonialList } from "../testimonial-list";
import type { Testimonial } from "@/types/index";

const makeTestimonial = (overrides: Partial<Testimonial> = {}): Testimonial => ({
  id: "test-1",
  project_id: "project-1",
  status: "pending",
  author_name: "山田 太郎",
  author_title: null,
  author_company: null,
  author_email: null,
  author_avatar_url: null,
  rating: 5,
  content: "テストコンテンツ",
  tags: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("TestimonialList", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("テスティモニアルが一覧表示される", () => {
    const testimonials = [
      makeTestimonial({ id: "1", author_name: "テストユーザー1" }),
      makeTestimonial({ id: "2", author_name: "テストユーザー2" }),
    ];

    render(<TestimonialList initialTestimonials={testimonials} />);

    expect(screen.getByTestId("testimonial-list")).toBeInTheDocument();
    expect(screen.getByText("テストユーザー1")).toBeInTheDocument();
    expect(screen.getByText("テストユーザー2")).toBeInTheDocument();
  });

  it("テスティモニアルが空のとき空状態が表示される", () => {
    render(<TestimonialList initialTestimonials={[]} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(
      screen.getByText("テスティモニアルがありません")
    ).toBeInTheDocument();
  });
});
