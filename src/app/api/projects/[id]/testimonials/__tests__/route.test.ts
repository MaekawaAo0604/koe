import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- hoisted: vi.mock より前に評価される変数 ---
const { mockLimitFn } = vi.hoisted(() => ({
  mockLimitFn: vi.fn().mockResolvedValue({ success: true }),
}));

// Server クライアントのモック（GET エンドポイント用）
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Service Role クライアントのモック
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/plan", () => ({
  getTestimonialLimit: vi.fn(),
  isAtLimit: vi.fn(),
}));

// Upstash ratelimit のモック（slidingWindow を含む）
vi.mock("@upstash/ratelimit", () => {
  const mockClass = vi.fn().mockImplementation(() => ({
    limit: mockLimitFn,
  }));
  (mockClass as unknown as { slidingWindow: ReturnType<typeof vi.fn> }).slidingWindow =
    vi.fn().mockReturnValue({});
  return { Ratelimit: mockClass };
});

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({}),
  },
}));

// --- Supabase モック ---
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockStorage = vi.fn();

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

  mockUpload.mockReset();
  mockGetPublicUrl.mockReset();
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: "https://example.com/avatars/test.jpg" },
  });

  mockStorage.mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  });
}

const mockSupabase = {
  from: mockFrom,
  storage: {
    from: mockStorage,
  },
};

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getTestimonialLimit, isAtLimit } from "@/lib/plan";

const mockCreateServiceRoleClient = vi.mocked(createServiceRoleClient);
const mockGetTestimonialLimit = vi.mocked(getTestimonialLimit);
const mockIsAtLimit = vi.mocked(isAtLimit);

function makeJsonRequest(body: unknown) {
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
    mockLimitFn.mockReset();
    mockLimitFn.mockResolvedValue({ success: true });
    mockCreateServiceRoleClient.mockReturnValue(
      mockSupabase as ReturnType<typeof createServiceRoleClient>
    );
    mockGetTestimonialLimit.mockReturnValue(Infinity);
    mockIsAtLimit.mockReturnValue(false);
  });

  it("正常投稿で201を返す", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: "test-id", user_id: "user-1" }, error: null })
      .mockResolvedValueOnce({ data: { plan: "free" }, error: null })
      .mockResolvedValueOnce({
        data: { id: "t-1", ...validBody, project_id: "test-id", status: "pending" },
        error: null,
      });

    const { POST } = await import("../route");
    const req = makeJsonRequest(validBody);
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(201);
  });

  it("レートリミット超過で429を返す", async () => {
    mockLimitFn.mockResolvedValue({ success: false });

    const { POST } = await import("../route");
    const req = makeJsonRequest(validBody);
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("プロジェクトが存在しない場合は404を返す", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "Not found" } });

    const { POST } = await import("../route");
    const req = makeJsonRequest(validBody);
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
    const req = makeJsonRequest({ author_name: "", rating: 5, content: "" });
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
    const req = makeJsonRequest({ ...validBody, rating: 6 });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(400);
  });

  it("Freeプランの件数上限超過で400を返す", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: "test-id", user_id: "user-1" }, error: null })
      .mockResolvedValueOnce({ data: { plan: "free" }, error: null });

    mockGetTestimonialLimit.mockReturnValue(10);
    mockIsAtLimit.mockReturnValue(true);

    const { POST } = await import("../route");
    const req = makeJsonRequest(validBody);
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("TESTIMONIAL_LIMIT_REACHED");
  });

  it("DBトリガーによるTESTIMONIAL_LIMIT_REACHEDエラーで400を返す", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: "test-id", user_id: "user-1" }, error: null })
      .mockResolvedValueOnce({ data: { plan: "free" }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "TESTIMONIAL_LIMIT_REACHED: Free plan allows up to 10 testimonials per project.",
          code: "P0001",
        },
      });

    mockGetTestimonialLimit.mockReturnValue(10);
    mockIsAtLimit.mockReturnValue(false);

    const { POST } = await import("../route");
    const req = makeJsonRequest(validBody);
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("TESTIMONIAL_LIMIT_REACHED");
  });

  it("multipart/form-data で顔写真ありの場合にアップロードされて201を返す", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: "test-id", user_id: "user-1" }, error: null })
      .mockResolvedValueOnce({ data: { plan: "pro" }, error: null })
      .mockResolvedValueOnce({
        data: {
          id: "t-1",
          ...validBody,
          project_id: "test-id",
          status: "pending",
          author_avatar_url: "https://example.com/avatars/test.jpg",
        },
        error: null,
      });

    mockUpload.mockResolvedValue({ error: null });

    const { POST } = await import("../route");

    // 1KB のダミー File（instanceof File を満たす）
    const mockAvatarFile = new File([new Uint8Array(1024)], "avatar.jpg", {
      type: "image/jpeg",
    });
    // jsdom の File.arrayBuffer をスタブ化
    Object.defineProperty(mockAvatarFile, "arrayBuffer", {
      configurable: true,
      value: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
    });

    const mockFormData = {
      get: (key: string) => {
        const map: Record<string, string | File> = {
          author_name: "山田 太郎",
          rating: "5",
          content: "とても良いサービスでした！",
          avatar: mockAvatarFile,
        };
        return map[key] ?? null;
      },
    } as unknown as FormData;

    const req = new NextRequest(
      "http://localhost/api/projects/test-id/testimonials",
      {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=----boundary" },
        body: "dummy",
      }
    );
    vi.spyOn(req, "formData").mockResolvedValue(mockFormData);

    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(201);
    expect(mockUpload).toHaveBeenCalledOnce();
  });

  it("顔写真が2MBを超える場合は400を返す", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: "test-id", user_id: "user-1" }, error: null })
      .mockResolvedValueOnce({ data: { plan: "free" }, error: null });

    const { POST } = await import("../route");

    // 3MB 超のダミー File（instanceof File を満たす）
    // 2MB チェックで早期リターンするため arrayBuffer() は呼ばれない
    const oversizedAvatarFile = new File(
      [new Uint8Array(3 * 1024 * 1024 + 1)],
      "big.jpg",
      { type: "image/jpeg" }
    );

    const mockFormData = {
      get: (key: string) => {
        const map: Record<string, string | File> = {
          author_name: "山田 太郎",
          rating: "5",
          content: "とても良いサービスでした！",
          avatar: oversizedAvatarFile,
        };
        return map[key] ?? null;
      },
    } as unknown as FormData;

    const req = new NextRequest(
      "http://localhost/api/projects/test-id/testimonials",
      {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=----boundary" },
        body: "dummy",
      }
    );
    vi.spyOn(req, "formData").mockResolvedValue(mockFormData);

    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });
});

// ---- GET エンドポイントのテスト ----
import { createClient } from "@/lib/supabase/server";
const mockCreateClient = vi.mocked(createClient);

const mockTestimonials = [
  { id: "t-1", project_id: "test-id", status: "pending", author_name: "山田 太郎", rating: 5, content: "良い", tags: [], created_at: "2024-01-01T00:00:00Z" },
  { id: "t-2", project_id: "test-id", status: "approved", author_name: "田中 花子", rating: 4, content: "まあまあ", tags: ["おすすめ"], created_at: "2024-01-02T00:00:00Z" },
];

function buildServerClientMock(user: { id: string } | null, projectData: unknown, testimonialData: unknown) {
  const mockOrder = vi.fn().mockResolvedValue({ data: testimonialData, error: null });
  const mockOverlaps = vi.fn().mockReturnValue({ order: mockOrder });
  const mockEqRating = vi.fn().mockReturnValue({ order: mockOrder, overlaps: mockOverlaps });
  const mockEqStatus = vi.fn().mockReturnValue({ order: mockOrder, eq: mockEqRating, overlaps: mockOverlaps });
  const mockEqProject = vi.fn().mockReturnValue({ order: mockOrder, eq: mockEqStatus, overlaps: mockOverlaps });
  const mockSelectTestimonials = vi.fn().mockReturnValue({ eq: mockEqProject });

  const mockProjectSingle = vi.fn().mockResolvedValue({ data: projectData, error: projectData ? null : { code: "PGRST116" } });
  const mockProjectEq2 = vi.fn().mockReturnValue({ single: mockProjectSingle });
  const mockProjectEq1 = vi.fn().mockReturnValue({ eq: mockProjectEq2 });
  const mockSelectProject = vi.fn().mockReturnValue({ eq: mockProjectEq1 });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "projects") return { select: mockSelectProject };
      return { select: mockSelectTestimonials };
    }),
  };
}

describe("GET /api/projects/:id/testimonials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("未認証の場合は401を返す", async () => {
    mockCreateClient.mockResolvedValue(
      buildServerClientMock(null, null, null) as never
    );

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/projects/test-id/testimonials");
    const res = await GET(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("存在しないプロジェクトは404を返す", async () => {
    mockCreateClient.mockResolvedValue(
      buildServerClientMock({ id: "user-1" }, null, null) as never
    );

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/projects/nonexistent/testimonials");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
  });

  it("フィルタなしで全テスティモニアルを返す（200）", async () => {
    mockCreateClient.mockResolvedValue(
      buildServerClientMock({ id: "user-1" }, { id: "test-id" }, mockTestimonials) as never
    );

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/projects/test-id/testimonials");
    const res = await GET(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it("無効なstatusフィルタで400を返す", async () => {
    mockCreateClient.mockResolvedValue(
      buildServerClientMock({ id: "user-1" }, { id: "test-id" }, mockTestimonials) as never
    );

    const { GET } = await import("../route");
    const req = new NextRequest(
      "http://localhost/api/projects/test-id/testimonials?status=invalid"
    );
    const res = await GET(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("無効なratingフィルタで400を返す", async () => {
    mockCreateClient.mockResolvedValue(
      buildServerClientMock({ id: "user-1" }, { id: "test-id" }, mockTestimonials) as never
    );

    const { GET } = await import("../route");
    const req = new NextRequest(
      "http://localhost/api/projects/test-id/testimonials?rating=6"
    );
    const res = await GET(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });
});
