import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Service Role クライアントのモック
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/plan", () => ({
  getTestimonialLimit: vi.fn(),
  isAtLimit: vi.fn(),
}));

const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

function buildChain() {
  mockSingle.mockReset();

  mockEq.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
  });

  mockSelect.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
  });

  mockInsert.mockReturnValue({ select: mockSelect });

  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
  });
}

const mockSupabase = { from: mockFrom };

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getTestimonialLimit, isAtLimit } from "@/lib/plan";

const mockCreateServiceRoleClient = vi.mocked(createServiceRoleClient);
const mockGetTestimonialLimit = vi.mocked(getTestimonialLimit);
const mockIsAtLimit = vi.mocked(isAtLimit);

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/projects/test-id/testimonials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  author_name: "山田 太郎",
  rating: 5,
  content: "とても良いサービスでした！",
};

describe("POST /api/projects/[id]/testimonials", () => {
  beforeEach(() => {
    buildChain();
    mockCreateServiceRoleClient.mockReturnValue(mockSupabase as ReturnType<typeof createServiceRoleClient>);
    mockGetTestimonialLimit.mockReturnValue(Infinity);
    mockIsAtLimit.mockReturnValue(false);
  });

  it("正常投稿で201を返す", async () => {
    // プロジェクト取得
    mockSingle
      .mockResolvedValueOnce({ data: { id: "test-id", user_id: "user-1" }, error: null })
      // ユーザープラン取得
      .mockResolvedValueOnce({ data: { plan: "free" }, error: null })
      // testimonial INSERT
      .mockResolvedValueOnce({
        data: { id: "t-1", ...validBody, project_id: "test-id", status: "pending" },
        error: null,
      });

    const { POST } = await import("../route");
    const req = makeRequest(validBody);
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(201);
  });

  it("プロジェクトが存在しない場合は404を返す", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "Not found" } });

    const { POST } = await import("../route");
    const req = makeRequest(validBody);
    const res = await POST(req, { params: Promise.resolve({ id: "missing-id" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
  });

  it("必須フィールド不足でバリデーションエラー400を返す", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: "test-id", user_id: "user-1" }, error: null })
      .mockResolvedValueOnce({ data: { plan: "free" }, error: null });

    const { POST } = await import("../route");
    const req = makeRequest({ author_name: "", rating: 5, content: "" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("評価が範囲外の場合はバリデーションエラー400を返す", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: "test-id", user_id: "user-1" }, error: null })
      .mockResolvedValueOnce({ data: { plan: "free" }, error: null });

    const { POST } = await import("../route");
    const req = makeRequest({ ...validBody, rating: 6 });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(400);
  });

  it("Freeプランの件数上限超過で400を返す", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: "test-id", user_id: "user-1" }, error: null })
      .mockResolvedValueOnce({ data: { plan: "free" }, error: null });

    mockGetTestimonialLimit.mockReturnValue(10);
    // isAtLimit が true を返すようにモック（count の実際の値は関係ない）
    mockIsAtLimit.mockReturnValue(true);

    const { POST } = await import("../route");
    const req = makeRequest(validBody);
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("TESTIMONIAL_LIMIT_REACHED");
  });
});
