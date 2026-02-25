import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { ProjectCard } from "../project-card";
import type { ProjectWithCount } from "@/types/index";

const mockProject: ProjectWithCount = {
  id: "test-id-123",
  user_id: "user-id-456",
  name: "テストプロジェクト",
  slug: "test-project",
  logo_url: null,
  brand_color: "#6366f1",
  form_config: { fields: [], thank_you_message: "ありがとうございます" },
  testimonial_count: 5,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("ProjectCard", () => {
  it("プロジェクト名が表示される", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText("テストプロジェクト")).toBeInTheDocument();
  });

  it("スラッグが表示される", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText("test-project")).toBeInTheDocument();
  });

  it("テスティモニアル件数が表示される", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("件のテスティモニアル")).toBeInTheDocument();
  });

  it("プロジェクト詳細へのリンクが存在する", () => {
    render(<ProjectCard project={mockProject} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/projects/test-id-123");
  });

  it("テスティモニアル件数が0のときも表示される", () => {
    const projectWithNoTestimonials: ProjectWithCount = {
      ...mockProject,
      testimonial_count: 0,
    };
    render(<ProjectCard project={projectWithNoTestimonials} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("ブランドカラーのインジケーターが表示される", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByTestId("brand-color-indicator")).toBeInTheDocument();
  });
});
