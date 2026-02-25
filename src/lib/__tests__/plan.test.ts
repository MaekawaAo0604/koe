import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUserPlan,
  isPro,
  getTestimonialLimit,
  getProjectLimit,
  isAtLimit,
  FREE_PLAN_TESTIMONIAL_LIMIT,
  FREE_PLAN_PROJECT_LIMIT,
} from "@/lib/plan";

// Supabase サーバークライアントのモック
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockSupabaseClient = { from: mockFrom };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe("getUserPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Freeプランのユーザーに 'free' を返す", async () => {
    mockSingle.mockResolvedValue({ data: { plan: "free" }, error: null });

    const plan = await getUserPlan("user-123");

    expect(plan).toBe("free");
    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(mockSelect).toHaveBeenCalledWith("plan");
    expect(mockEq).toHaveBeenCalledWith("id", "user-123");
  });

  it("Proプランのユーザーに 'pro' を返す", async () => {
    mockSingle.mockResolvedValue({ data: { plan: "pro" }, error: null });

    const plan = await getUserPlan("user-456");

    expect(plan).toBe("pro");
  });

  it("ユーザーが見つからない場合に 'free' を返す", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "Not found" } });

    const plan = await getUserPlan("nonexistent-user");

    expect(plan).toBe("free");
  });
});

describe("isPro", () => {
  it("'pro' の場合に true を返す", () => {
    expect(isPro("pro")).toBe(true);
  });

  it("'free' の場合に false を返す", () => {
    expect(isPro("free")).toBe(false);
  });
});

describe("getTestimonialLimit", () => {
  it("Proプランは Infinity を返す", () => {
    expect(getTestimonialLimit("pro")).toBe(Infinity);
  });

  it("Freeプランは FREE_PLAN_TESTIMONIAL_LIMIT を返す", () => {
    expect(getTestimonialLimit("free")).toBe(FREE_PLAN_TESTIMONIAL_LIMIT);
    expect(getTestimonialLimit("free")).toBe(10);
  });
});

describe("getProjectLimit", () => {
  it("Proプランは Infinity を返す", () => {
    expect(getProjectLimit("pro")).toBe(Infinity);
  });

  it("Freeプランは FREE_PLAN_PROJECT_LIMIT を返す", () => {
    expect(getProjectLimit("free")).toBe(FREE_PLAN_PROJECT_LIMIT);
    expect(getProjectLimit("free")).toBe(1);
  });
});

describe("isAtLimit", () => {
  it("上限に達した場合（current === limit）に true を返す", () => {
    expect(isAtLimit(10, 10)).toBe(true);
  });

  it("上限を超えた場合（current > limit）に true を返す", () => {
    expect(isAtLimit(11, 10)).toBe(true);
  });

  it("上限未満の場合（current < limit）に false を返す", () => {
    expect(isAtLimit(9, 10)).toBe(false);
    expect(isAtLimit(0, 10)).toBe(false);
  });
});

describe("定数", () => {
  it("FREE_PLAN_TESTIMONIAL_LIMIT が 10 である", () => {
    expect(FREE_PLAN_TESTIMONIAL_LIMIT).toBe(10);
  });

  it("FREE_PLAN_PROJECT_LIMIT が 1 である", () => {
    expect(FREE_PLAN_PROJECT_LIMIT).toBe(1);
  });
});
