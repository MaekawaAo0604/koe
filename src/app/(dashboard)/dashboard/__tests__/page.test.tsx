import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/plan", () => ({
  getUserPlan: vi.fn(),
  getProjectLimit: vi.fn(),
  isAtLimit: vi.fn(),
}));

// ProjectList は UI テスト上の詳細を省略してシンプルにモック
vi.mock("@/components/dashboard/project-list", () => ({
  ProjectList: ({ projects }: { projects: unknown[] }) => (
    <ul data-testid="project-list">
      {(projects as { id: string; name: string }[]).map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  ),
}));

const makeProject = (id: string, name: string) => ({
  id,
  user_id: "user-1",
  name,
  slug: `slug-${id}`,
  logo_url: null,
  brand_color: "#6366f1",
  form_config: {},
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  testimonials: [{ count: 0 }],
});

function buildSupabaseClient(projects: ReturnType<typeof makeProject>[]) {
  const mockOrder = vi.fn().mockResolvedValue({ data: projects, error: null });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({ select: mockSelect }),
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("Freeプランでプロジェクト上限に達した場合（要件2 AC-6）", () => {
    it("プロジェクト制限バナーが表示される", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseClient([makeProject("proj-1", "プロジェクトA")]) as never
      );
      vi.mocked(getUserPlan).mockResolvedValue("free");
      vi.mocked(getProjectLimit).mockReturnValue(1);
      vi.mocked(isAtLimit).mockReturnValue(true);

      const { default: DashboardPage } = await import("../page");
      const component = await DashboardPage();
      render(component);

      expect(screen.getByTestId("project-limit-banner")).toBeInTheDocument();
      expect(
        screen.getByText("Freeプランのプロジェクト上限に達しました")
      ).toBeInTheDocument();
    });

    it("「Proにアップグレード」ボタンが表示される", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseClient([makeProject("proj-1", "プロジェクトA")]) as never
      );
      vi.mocked(getUserPlan).mockResolvedValue("free");
      vi.mocked(getProjectLimit).mockReturnValue(1);
      vi.mocked(isAtLimit).mockReturnValue(true);

      const { default: DashboardPage } = await import("../page");
      const component = await DashboardPage();
      render(component);

      expect(screen.getByTestId("upgrade-button-project-limit")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Proにアップグレード/ })
      ).toHaveAttribute("href", "/billing");
    });

    it("「新しいプロジェクト作成」ボタンが表示されない", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseClient([makeProject("proj-1", "プロジェクトA")]) as never
      );
      vi.mocked(getUserPlan).mockResolvedValue("free");
      vi.mocked(getProjectLimit).mockReturnValue(1);
      vi.mocked(isAtLimit).mockReturnValue(true);

      const { default: DashboardPage } = await import("../page");
      const component = await DashboardPage();
      render(component);

      expect(
        screen.queryByRole("link", { name: /新しいプロジェクト作成/ })
      ).not.toBeInTheDocument();
    });
  });

  describe("Freeプランでプロジェクト上限に未達の場合（要件2 AC-6）", () => {
    it("「新しいプロジェクト作成」ボタンが表示される", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseClient([]) as never
      );
      vi.mocked(getUserPlan).mockResolvedValue("free");
      vi.mocked(getProjectLimit).mockReturnValue(1);
      vi.mocked(isAtLimit).mockReturnValue(false);

      const { default: DashboardPage } = await import("../page");
      const component = await DashboardPage();
      render(component);

      expect(
        screen.getByRole("link", { name: /新しいプロジェクト作成/ })
      ).toBeInTheDocument();
    });

    it("制限バナーが表示されない", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseClient([]) as never
      );
      vi.mocked(getUserPlan).mockResolvedValue("free");
      vi.mocked(getProjectLimit).mockReturnValue(1);
      vi.mocked(isAtLimit).mockReturnValue(false);

      const { default: DashboardPage } = await import("../page");
      const component = await DashboardPage();
      render(component);

      expect(screen.queryByTestId("project-limit-banner")).not.toBeInTheDocument();
    });
  });

  describe("Proプランの場合（要件2 AC-7）", () => {
    it("複数プロジェクトがあっても「新しいプロジェクト作成」ボタンが表示される", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseClient([
          makeProject("proj-1", "プロジェクトA"),
          makeProject("proj-2", "プロジェクトB"),
          makeProject("proj-3", "プロジェクトC"),
        ]) as never
      );
      vi.mocked(getUserPlan).mockResolvedValue("pro");
      vi.mocked(getProjectLimit).mockReturnValue(Infinity);
      vi.mocked(isAtLimit).mockReturnValue(false);

      const { default: DashboardPage } = await import("../page");
      const component = await DashboardPage();
      render(component);

      expect(
        screen.getByRole("link", { name: /新しいプロジェクト作成/ })
      ).toBeInTheDocument();
    });

    it("制限バナーが表示されない", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseClient([makeProject("proj-1", "プロジェクトA")]) as never
      );
      vi.mocked(getUserPlan).mockResolvedValue("pro");
      vi.mocked(getProjectLimit).mockReturnValue(Infinity);
      vi.mocked(isAtLimit).mockReturnValue(false);

      const { default: DashboardPage } = await import("../page");
      const component = await DashboardPage();
      render(component);

      expect(screen.queryByTestId("project-limit-banner")).not.toBeInTheDocument();
    });
  });

  describe("プロジェクト一覧の表示", () => {
    it("プロジェクト名が一覧に表示される", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getUserPlan, getProjectLimit, isAtLimit } = await import("@/lib/plan");

      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseClient([
          makeProject("proj-1", "テストプロジェクト"),
        ]) as never
      );
      vi.mocked(getUserPlan).mockResolvedValue("free");
      vi.mocked(getProjectLimit).mockReturnValue(1);
      vi.mocked(isAtLimit).mockReturnValue(true);

      const { default: DashboardPage } = await import("../page");
      const component = await DashboardPage();
      render(component);

      expect(screen.getByText("テストプロジェクト")).toBeInTheDocument();
    });
  });
});
