import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { ProjectList } from "../project-list";
import type { ProjectWithCount } from "@/types/index";

const makeProject = (overrides: Partial<ProjectWithCount> = {}): ProjectWithCount => ({
  id: "project-id-1",
  user_id: "user-id-1",
  name: "サンプルプロジェクト",
  slug: "sample-project",
  logo_url: null,
  brand_color: "#6366f1",
  form_config: { fields: [], thank_you_message: "ありがとうございます" },
  testimonial_count: 3,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("ProjectList", () => {
  describe("空状態", () => {
    it("プロジェクトが0件のとき空状態メッセージが表示される", () => {
      render(<ProjectList projects={[]} />);
      expect(screen.getByText("プロジェクトがありません")).toBeInTheDocument();
    });

    it("空状態に説明テキストが表示される", () => {
      render(<ProjectList projects={[]} />);
      expect(
        screen.getByText(/最初のプロジェクトを作成/)
      ).toBeInTheDocument();
    });

    it("空状態に「プロジェクトを作成する」ボタンが表示される", () => {
      render(<ProjectList projects={[]} />);
      expect(
        screen.getByRole("link", { name: /プロジェクトを作成する/ })
      ).toBeInTheDocument();
    });

    it("空状態の「プロジェクトを作成する」リンクが /projects/new を指す", () => {
      render(<ProjectList projects={[]} />);
      const link = screen.getByRole("link", { name: /プロジェクトを作成する/ });
      expect(link).toHaveAttribute("href", "/projects/new");
    });
  });

  describe("プロジェクト一覧", () => {
    it("1件のプロジェクトが表示される", () => {
      const projects = [makeProject({ name: "プロジェクトA" })];
      render(<ProjectList projects={projects} />);
      expect(screen.getByText("プロジェクトA")).toBeInTheDocument();
    });

    it("複数のプロジェクトがすべて表示される", () => {
      const projects = [
        makeProject({ id: "id-1", name: "プロジェクトA" }),
        makeProject({ id: "id-2", name: "プロジェクトB" }),
        makeProject({ id: "id-3", name: "プロジェクトC" }),
      ];
      render(<ProjectList projects={projects} />);
      expect(screen.getByText("プロジェクトA")).toBeInTheDocument();
      expect(screen.getByText("プロジェクトB")).toBeInTheDocument();
      expect(screen.getByText("プロジェクトC")).toBeInTheDocument();
    });

    it("プロジェクト一覧表示時は空状態メッセージが表示されない", () => {
      const projects = [makeProject()];
      render(<ProjectList projects={projects} />);
      expect(
        screen.queryByText("プロジェクトがありません")
      ).not.toBeInTheDocument();
    });

    it("リスト要素として正しくマークアップされている", () => {
      const projects = [makeProject()];
      render(<ProjectList projects={projects} />);
      expect(screen.getByRole("list")).toBeInTheDocument();
    });
  });
});
