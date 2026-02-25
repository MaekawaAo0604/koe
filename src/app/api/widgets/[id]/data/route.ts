import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database, PlanType, WidgetType } from "@/types/database";

type Params = { params: Promise<{ id: string }> };
type TestimonialRow = Database["public"]["Tables"]["testimonials"]["Row"];

// GET /api/widgets/:id/data - ウィジェット表示用データ（公開、認証不要）
// 要件5 AC-5,10,12 / 要件9 AC-4,5
export async function GET(_request: NextRequest, { params }: Params) {
  const { id: widgetId } = await params;

  // Service Role クライアントを使用（公開APIのためRLS回避が必要）
  const supabase = createServiceRoleClient();

  // ウィジェットを取得
  const { data: widget, error: widgetError } = await supabase
    .from("widgets")
    .select("id, project_id, type, config")
    .eq("id", widgetId)
    .single();

  if (widgetError || !widget) {
    return NextResponse.json(
      { error: "ウィジェットが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // プロジェクトのオーナーのプランを取得（バッジ表示判定用）
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", widget.project_id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "プロジェクトが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const { data: userData } = await supabase
    .from("users")
    .select("plan")
    .eq("id", project.user_id)
    .single();

  const plan: PlanType = (userData as { plan: PlanType } | null)?.plan ?? "free";

  // 承認済みテスティモニアルのみ取得（author_email は除外）(要件5 AC-12, 要件9 AC-4)
  const { data: testimonials, error: testimonialsError } = await supabase
    .from("testimonials")
    .select(
      "id, author_name, author_title, author_company, author_avatar_url, rating, content, created_at"
    )
    .eq("project_id", widget.project_id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (testimonialsError) {
    return NextResponse.json(
      { error: "テスティモニアルの取得に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  // max_items が設定されている場合は上限を適用
  const config = widget.config as Record<string, unknown> | null;
  const maxItems = typeof config?.max_items === "number" ? config.max_items : 100;
  const limitedTestimonials = (testimonials ?? []).slice(0, maxItems) as Pick<
    TestimonialRow,
    | "id"
    | "author_name"
    | "author_title"
    | "author_company"
    | "author_avatar_url"
    | "rating"
    | "content"
    | "created_at"
  >[];

  const responseData = {
    widget: {
      type: widget.type as WidgetType,
      config: widget.config,
    },
    testimonials: limitedTestimonials,
    plan,
  };

  // CDNキャッシュ: s-maxage=300, stale-while-revalidate=60 (要件5 AC-10, 要件9 AC-5)
  return NextResponse.json(responseData, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// プリフライトリクエスト対応 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
