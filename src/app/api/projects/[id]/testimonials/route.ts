import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { submitTestimonialSchema } from "@/lib/validators/testimonial";
import { getTestimonialLimit, isAtLimit } from "@/lib/plan";
import type { PlanType } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/:id/testimonials - テスティモニアル投稿（認証不要・公開）
export async function POST(request: NextRequest, { params }: Params) {
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

  // Freeプランの件数制限チェック
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

  // リクエストボディのパース
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが無効です", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // バリデーション
  const parsed = submitTestimonialSchema.safeParse(body);
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

  // テスティモニアル挿入（status=pending で固定）
  const { data: testimonial, error: insertError } = await supabase
    .from("testimonials")
    .insert({
      project_id: projectId,
      status: "pending",
      author_name,
      author_title: author_title || null,
      author_company: author_company || null,
      author_email: author_email || null,
      rating,
      content,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "テスティモニアルの投稿に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json(testimonial, { status: 201 });
}
