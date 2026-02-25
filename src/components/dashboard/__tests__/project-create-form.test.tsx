import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { ProjectCreateForm } from "../project-create-form";

// Server Action のモック
vi.mock("@/app/(dashboard)/projects/new/actions", () => ({
  createProject: vi.fn(),
}));

// generateSlug のモック（実装そのままでも可だが、テストを決定論的にするためモック）
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    generateSlug: (name: string) =>
      name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
  };
});

describe("ProjectCreateForm", () => {
  describe("初期表示", () => {
    it("プロジェクト名フィールドが表示される", () => {
      render(<ProjectCreateForm />);
      expect(screen.getByLabelText(/プロジェクト名/)).toBeInTheDocument();
    });

    it("スラッグフィールドが表示される", () => {
      render(<ProjectCreateForm />);
      expect(screen.getByLabelText("スラッグ（URL）")).toBeInTheDocument();
    });

    it("ブランドカラーフィールドが表示される", () => {
      render(<ProjectCreateForm />);
      expect(screen.getByLabelText("ブランドカラー")).toBeInTheDocument();
    });

    it("「プロジェクトを作成」ボタンが表示される", () => {
      render(<ProjectCreateForm />);
      expect(
        screen.getByRole("button", { name: "プロジェクトを作成" })
      ).toBeInTheDocument();
    });

    it("ブランドカラーの初期値が #6366f1 である", () => {
      render(<ProjectCreateForm />);
      const colorInput = screen.getByLabelText("ブランドカラー");
      expect(colorInput).toHaveValue("#6366f1");
    });

    it("/f/ のプレフィックスが表示される", () => {
      render(<ProjectCreateForm />);
      expect(screen.getByText("/f/")).toBeInTheDocument();
    });
  });

  describe("スラッグ自動生成", () => {
    it("プロジェクト名を入力するとスラッグが自動生成される", () => {
      render(<ProjectCreateForm />);
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      const slugInput = screen.getByLabelText("スラッグ（URL）");

      fireEvent.change(nameInput, { target: { value: "My Project" } });

      expect(slugInput).toHaveValue("my-project");
    });

    it("スラッグを手動編集すると自動生成が無効になる", () => {
      render(<ProjectCreateForm />);
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      const slugInput = screen.getByLabelText("スラッグ（URL）");

      // まず手動でスラッグを編集
      fireEvent.change(slugInput, { target: { value: "custom-slug" } });

      // その後でプロジェクト名を変更
      fireEvent.change(nameInput, { target: { value: "Another Project" } });

      // スラッグは手動入力のまま
      expect(slugInput).toHaveValue("custom-slug");
    });
  });

  describe("ブランドカラー同期", () => {
    it("テキスト入力でブランドカラーが変わる", () => {
      render(<ProjectCreateForm />);
      const colorInput = screen.getByLabelText("ブランドカラー");

      fireEvent.change(colorInput, { target: { value: "#ff0000" } });

      expect(colorInput).toHaveValue("#ff0000");
    });

    it("カラーピッカーでブランドカラーが変わる", () => {
      render(<ProjectCreateForm />);
      const colorPicker = screen.getByLabelText("カラーピッカー");
      const colorInput = screen.getByLabelText("ブランドカラー");

      fireEvent.change(colorPicker, { target: { value: "#00ff00" } });

      expect(colorInput).toHaveValue("#00ff00");
    });
  });

  describe("アクセシビリティ", () => {
    it("送信ボタンの type が submit である", () => {
      render(<ProjectCreateForm />);
      const button = screen.getByRole("button", { name: "プロジェクトを作成" });
      expect(button).toHaveAttribute("type", "submit");
    });

    it("プロジェクト名フィールドに required 属性がある", () => {
      render(<ProjectCreateForm />);
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      expect(nameInput).toBeRequired();
    });
  });
});
