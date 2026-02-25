import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { submitTestimonialSchema } from "@/lib/validators/testimonial";
import { getTestimonialLimit, isAtLimit } from "@/lib/plan";
import type { PlanType, TestimonialStatus } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

// Upstash Ratelimit: 10件/時間/IP (sliding window) — 遅延初期化
let _ratelimit: Ratelimit | null = null;
function getRatelimit() {
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 h"),
    });
  }
  return _ratelimit;
}

// GET /api/projects/:id/testimonials - テスティモニアル一覧取得（フィルタ対応）
// フィルタパラメータ: status, rating, tags（カンマ区切り）
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "認証が必要です", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id: projectId } = await params;

  // プロジェクトの存在確認とオーナーチェック (RLSによる保護)
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "プロジェクトが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // クエリパラメータからフィルタを取得
  const searchParams = request.nextUrl.searchParams;
  const statusParam = searchParams.get("status");
  const ratingParam = searchParams.get("rating");
  const tagsParam = searchParams.get("tags");

  // テスティモニアル一覧クエリ（作成日時降順）
  let query = supabase
    .from("testimonials")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // statusフィルタ (pending | approved | rejected)
  if (statusParam) {
    const validStatuses: TestimonialStatus[] = ["pending", "approved", "rejected"];
    if (validStatuses.includes(statusParam as TestimonialStatus)) {
      query = query.eq("status", statusParam as TestimonialStatus);
    } else {
      return NextResponse.json(
        { error: "statusの値が無効です", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
  }

  // ratingフィルタ (1-5)
  if (ratingParam) {
    const rating = Number(ratingParam);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "ratingは1〜5の整数で指定してください", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    query = query.eq("rating", rating);
  }

  // tagsフィルタ（カンマ区切り → 配列 → overlaps検索）
  if (tagsParam) {
    const tags = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      query = query.overlaps("tags", tags);
    }
  }

  const { data: testimonials, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json(
      { error: "テスティモニアルの取得に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json(testimonials ?? []);
}

// POST /api/projects/:id/testimonials - テスティモニアル投稿（認証不要・公開）
export async function POST(request: NextRequest, { params }: Params) {
  // --- レートリミットチェック (要件3 AC-7, 要件9 AC-7) ---
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  const { success: rateLimitSuccess } = await getRatelimit().limit(ip);
  if (!rateLimitSuccess) {
    return NextResponse.json(
      {
        error:
          "投稿回数の上限に達しました。しばらく時間をおいて再度お試しください。",
        code: "RATE_LIMITED",
      },
      { status: 429 }
    );
  }

  const { id: projectId } = await params;

  const supabase = createServiceRoleClient();

  // プロジェクトの存在確認 + オーナーのプランを取得
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "プロジェクトが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // プロジェクトオーナーのプランを確認
  const { data: userData } = await supabase
    .from("users")
    .select("plan")
    .eq("id", project.user_id)
    .single();

  const plan: PlanType = (userData as { plan: PlanType } | null)?.plan ?? "free";
  const testimonialLimit = getTestimonialLimit(plan);

  // Freeプランの件数制限チェック (要件3 AC-10)
  if (testimonialLimit !== Infinity) {
    const { count, error: countError } = await supabase
      .from("testimonials")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (countError) {
      return NextResponse.json(
        { error: "テスティモニアル件数の確認に失敗しました", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    if (isAtLimit(count ?? 0, testimonialLimit)) {
      return NextResponse.json(
        {
          error: `このプロジェクトのテスティモニアルは上限（${testimonialLimit}件）に達しています`,
          code: "TESTIMONIAL_LIMIT_REACHED",
        },
        { status: 400 }
      );
    }
  }

  // --- リクエストのパース（multipart/form-data または application/json） ---
  const contentType = request.headers.get("content-type") ?? "";

  let bodyFields: unknown;
  let avatarFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "リクエストボディが無効です", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // テキストフィールドを抽出
    bodyFields = {
      author_name: formData.get("author_name") ?? undefined,
      author_title: formData.get("author_title") ?? undefined,
      author_company: formData.get("author_company") ?? undefined,
      author_email: formData.get("author_email") ?? undefined,
      rating: formData.get("rating")
        ? Number(formData.get("rating"))
        : undefined,
      content: formData.get("content") ?? undefined,
    };

    // ファイルフィールドを抽出
    const avatar = formData.get("avatar");
    if (avatar instanceof File && avatar.size > 0) {
      avatarFile = avatar;

      // 2MB制限チェック (要件3 AC-8, 要件9 AC-8)
      if (avatarFile.size > MAX_AVATAR_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: "顔写真は2MB以下にしてください",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }
    }
  } else {
    // application/json
    try {
      bodyFields = await request.json();
    } catch {
      return NextResponse.json(
        { error: "リクエストボディが無効です", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
  }

  // バリデーション
  const parsed = submitTestimonialSchema.safeParse(bodyFields);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "入力内容に誤りがあります",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const {
    author_name,
    author_title,
    author_company,
    author_email,
    rating,
    content,
  } = parsed.data;

  // --- 顔写真アップロード（Supabase Storage avatars バケット）(要件3 AC-8) ---
  let avatarUrl: string | null = null;
  if (avatarFile) {
    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    const fileName = `${projectId}/${Date.now()}.${ext}`;
    const arrayBuffer = await avatarFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, arrayBuffer, {
        contentType: avatarFile.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "顔写真のアップロードに失敗しました", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    avatarUrl = publicUrlData.publicUrl;
  }

  // テスティモニアル挿入（status=pending で固定）(要件3 AC-2, 要件9 AC-3)
  const { data: testimonial, error: insertError } = await supabase
    .from("testimonials")
    .insert({
      project_id: projectId,
      status: "pending",
      author_name,
      author_title: author_title || null,
      author_company: author_company || null,
      author_email: author_email || null,
      author_avatar_url: avatarUrl,
      rating,
      content,
    })
    .select()
    .single();

  if (insertError) {
    // DBトリガーによるFreeプラン件数制限エラー (P0001)
    if (
      insertError.message?.includes("TESTIMONIAL_LIMIT_REACHED") ||
      (insertError as { code?: string }).code === "P0001"
    ) {
      return NextResponse.json(
        {
          error: `このプロジェクトのテスティモニアルは上限（${testimonialLimit}件）に達しています`,
          code: "TESTIMONIAL_LIMIT_REACHED",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "テスティモニアルの投稿に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json(testimonial, { status: 201 });
}
