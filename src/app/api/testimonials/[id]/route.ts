import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateTestimonialSchema } from "@/lib/validators/testimonial";
import type { Database } from "@/types/database";

type Params = { params: Promise<{ id: string }> };
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type TestimonialRow = Database["public"]["Tables"]["testimonials"]["Row"];
type TestimonialUpdate = Database["public"]["Tables"]["testimonials"]["Update"];

/**
 * テスティモニアルの存在確認とオーナー検証を行うヘルパー
 * Supabase の型推論が string[] (tags) を含む Row 型で `never` になる既知の問題を回避するため
 * as any キャストを使用（projects/[id]/route.ts と同じパターン）
 */
async function getTestimonialWithOwnerCheck(
  supabase: SupabaseClient,
  testimonialId: string,
  userId: string
) {
  // テスティモニアルを取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: testimonial, error: fetchError } = await (supabase.from("testimonials") as any)
    .select("id, project_id")
    .eq("id", testimonialId)
    .single() as { data: Pick<TestimonialRow, "id" | "project_id"> | null; error: unknown };

  if (fetchError || !testimonial) {
    return { testimonial: null, error: "NOT_FOUND" as const };
  }

  // プロジェクトのオーナーチェック（RLS + user_id チェック）
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", testimonial.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!project) {
    return { testimonial: null, error: "FORBIDDEN" as const };
  }

  return { testimonial, error: null };
}

// PATCH /api/testimonials/:id - テスティモニアル更新（承認/非承認、タグ、表示名）
export async function PATCH(request: NextRequest, { params }: Params) {
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
  const parsed = updateTestimonialSchema.safeParse(body);
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

  const { id: testimonialId } = await params;

  // 存在確認とオーナーチェック
  const { testimonial, error: checkError } = await getTestimonialWithOwnerCheck(
    supabase,
    testimonialId,
    user.id
  );

  if (checkError === "NOT_FOUND") {
    return NextResponse.json(
      { error: "テスティモニアルが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (checkError === "FORBIDDEN" || !testimonial) {
    return NextResponse.json(
      { error: "アクセス権限がありません", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // 更新データを構築
  const updateData: TestimonialUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
  }
  if (parsed.data.tags !== undefined) {
    updateData.tags = parsed.data.tags;
  }
  if (parsed.data.author_name !== undefined) {
    updateData.author_name = parsed.data.author_name;
  }

  // 更新実行
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedTestimonial, error: updateError } = await (supabase.from("testimonials") as any)
    .update(updateData)
    .eq("id", testimonialId)
    .select()
    .single() as { data: TestimonialRow | null; error: { message?: string } | null };

  if (updateError) {
    return NextResponse.json(
      { error: "テスティモニアルの更新に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedTestimonial);
}

// DELETE /api/testimonials/:id - テスティモニアル削除
export async function DELETE(_request: NextRequest, { params }: Params) {
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

  const { id: testimonialId } = await params;

  // 存在確認とオーナーチェック
  const { testimonial, error: checkError } = await getTestimonialWithOwnerCheck(
    supabase,
    testimonialId,
    user.id
  );

  if (checkError === "NOT_FOUND") {
    return NextResponse.json(
      { error: "テスティモニアルが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (checkError === "FORBIDDEN" || !testimonial) {
    return NextResponse.json(
      { error: "アクセス権限がありません", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // 削除実行
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase.from("testimonials") as any)
    .delete()
    .eq("id", testimonialId) as { error: { message?: string } | null };

  if (deleteError) {
    return NextResponse.json(
      { error: "テスティモニアルの削除に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
