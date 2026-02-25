import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// next/navigationのモック
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

// PoweredByBadgeのモック
vi.mock("@/components/shared/powered-by-badge", () => ({
  PoweredByBadge: ({ utmSource }: { utmSource: string }) => (
    <div data-testid="powered-by-badge" data-utm-source={utmSource}>
      Powered by Koe
    </div>
  ),
}));

// createServiceRoleClientのモック
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}));

const mockProject = {
  id: "proj-1",
  name: "テストプロジェクト",
  slug: "test-project",
  logo_url: null,
  brand_color: "#6366f1",
  user_id: "user-1",
};

const mockTestimonials = [
  {
    id: "t-1",
    author_name: "田中太郎",
    author_title: "エンジニア",
    author_company: "Tech Corp",
    author_avatar_url: null,
    rating: 5,
    content: "素晴らしいサービスです",
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "t-2",
    author_name: "山田花子",
    author_title: null,
    author_company: null,
    author_avatar_url: null,
    rating: 4,
    content: "使いやすいです",
    created_at: "2024-01-01T00:00:00Z",
  },
];

/**
 * Wall of Love ページ用のサービスロールクライアントモック
 */
function buildServiceClientMock({
  projectData = mockProject,
  projectError = null,
  userData = { plan: "free" },
  userError = null,
  testimonialData = mockTestimonials,
  testimonialError = null,
}: {
  projectData?: unknown;
  projectError?: unknown;
  userData?: unknown;
  userError?: unknown;
  testimonialData?: unknown;
  testimonialError?: unknown;
} = {}) {
  // プロジェクト取得チェーン: select → eq → single
  const mockProjectSingle = vi.fn().mockResolvedValue({
    data: projectData,
    error: projectError,
  });
  const mockProjectEq = vi.fn().mockReturnValue({ single: mockProjectSingle });
  const mockProjectSelect = vi.fn().mockReturnValue({ eq: mockProjectEq });

  // ユーザー取得チェーン: select → eq → single
  const mockUserSingle = vi.fn().mockResolvedValue({
    data: userData,
    error: userError,
  });
  const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle });
  const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq });

  // テスティモニアル取得チェーン: select → eq → eq → order
  const mockTestimonialsOrder = vi.fn().mockResolvedValue({
    data: testimonialData,
    error: testimonialError,
  });
  const mockTestimonialsEq2 = vi.fn().mockReturnValue({ order: mockTestimonialsOrder });
  const mockTestimonialsEq1 = vi.fn().mockReturnValue({ eq: mockTestimonialsEq2 });
  const mockTestimonialsSelect = vi.fn().mockReturnValue({ eq: mockTestimonialsEq1 });

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "projects") return { select: mockProjectSelect };
      if (table === "users") return { select: mockUserSelect };
      if (table === "testimonials") return { select: mockTestimonialsSelect };
      return {};
    }),
  };
}

const makeParams = (slug: string) => ({
  params: Promise.resolve({ slug }),
});

describe("WallOfLovePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("基本レンダリング", () => {
    it("プロジェクト名が表示される", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock() as never
      );

      const { default: WallOfLovePage } = await import("../page");
      const component = await WallOfLovePage(makeParams("test-project"));
      render(component);

      expect(screen.getByRole("heading", { name: "テストプロジェクト" })).toBeInTheDocument();
    });

    it("「お客様の声」のサブタイトルが表示される", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock() as never
      );

      const { default: WallOfLovePage } = await import("../page");
      const component = await WallOfLovePage(makeParams("test-project"));
      render(component);

      expect(screen.getByText("お客様の声")).toBeInTheDocument();
    });
  });

  describe("テスティモニアル表示（要件6 AC-2）", () => {
    it("承認済みテスティモニアルがグリッドで表示される", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock() as never
      );

      const { default: WallOfLovePage } = await import("../page");
      const component = await WallOfLovePage(makeParams("test-project"));
      render(component);

      expect(screen.getByTestId("testimonials-grid")).toBeInTheDocument();
      expect(screen.getAllByTestId("wall-card")).toHaveLength(2);
    });

    it("テスティモニアルのコンテンツが表示される", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock() as never
      );

      const { default: WallOfLovePage } = await import("../page");
      const component = await WallOfLovePage(makeParams("test-project"));
      render(component);

      expect(screen.getByText(/素晴らしいサービスです/)).toBeInTheDocument();
      expect(screen.getByText(/使いやすいです/)).toBeInTheDocument();
    });

    it("テスティモニアルの著者名が表示される", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock() as never
      );

      const { default: WallOfLovePage } = await import("../page");
      const component = await WallOfLovePage(makeParams("test-project"));
      render(component);

      expect(screen.getByText("田中太郎")).toBeInTheDocument();
      expect(screen.getByText("山田花子")).toBeInTheDocument();
    });

    it("テスティモニアルがない場合は空メッセージを表示する", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock({ testimonialData: [] }) as never
      );

      const { default: WallOfLovePage } = await import("../page");
      const component = await WallOfLovePage(makeParams("test-project"));
      render(component);

      expect(screen.getByText("まだテスティモニアルがありません。")).toBeInTheDocument();
      expect(screen.queryByTestId("wall-card")).not.toBeInTheDocument();
    });
  });

  describe("Powered by Koe バッジ（要件6 AC-3）", () => {
    it("Freeプランではバッジが表示される", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock({ userData: { plan: "free" } }) as never
      );

      const { default: WallOfLovePage } = await import("../page");
      const component = await WallOfLovePage(makeParams("test-project"));
      render(component);

      expect(screen.getByTestId("powered-by-badge")).toBeInTheDocument();
    });

    it("Freeプランのバッジに utmSource='wall' が渡される", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock({ userData: { plan: "free" } }) as never
      );

      const { default: WallOfLovePage } = await import("../page");
      const component = await WallOfLovePage(makeParams("test-project"));
      render(component);

      const badge = screen.getByTestId("powered-by-badge");
      expect(badge).toHaveAttribute("data-utm-source", "wall");
    });

    it("Proプランではバッジが表示されない", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock({ userData: { plan: "pro" } }) as never
      );

      const { default: WallOfLovePage } = await import("../page");
      const component = await WallOfLovePage(makeParams("test-project"));
      render(component);

      expect(screen.queryByTestId("powered-by-badge")).not.toBeInTheDocument();
    });
  });

  describe("プロジェクト未発見（404）", () => {
    it("存在しないslugの場合はnotFoundが呼ばれる", async () => {
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      vi.mocked(createServiceRoleClient).mockReturnValue(
        buildServiceClientMock({ projectData: null }) as never
      );

      const { notFound } = await import("next/navigation");
      const { default: WallOfLovePage } = await import("../page");

      // notFoundはthrowするが、モックはデフォルトでは何もしない
      // コンポーネントがnotFoundを呼んだ後にレンダリング継続しないようにするため、
      // notFoundが呼ばれたことを確認する
      try {
        await WallOfLovePage(makeParams("nonexistent"));
      } catch {
        // notFoundがthrowされる場合
      }

      expect(notFound).toHaveBeenCalled();
    });
  });
});
