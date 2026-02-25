import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateWidgetSchema } from "@/lib/validators/widget";
import { getUserPlan } from "@/lib/plan";
import type { Database, Json, WidgetType } from "@/types/database";

type Params = { params: Promise<{ id: string }> };
type WidgetRow = Database["public"]["Tables"]["widgets"]["Row"];
type WidgetUpdate = Database["public"]["Tables"]["widgets"]["Update"];
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * ウィジェットの存在確認とオーナー検証を行うヘルパー
 */
async function getWidgetWithOwnerCheck(
  supabase: SupabaseClient,
  widgetId: string,
  userId: string
) {
  // ウィジェットを取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: widget, error: fetchError } = await (supabase.from("widgets") as any)
    .select("id, project_id, type, config")
    .eq("id", widgetId)
    .single() as { data: Pick<WidgetRow, "id" | "project_id" | "type" | "config"> | null; error: unknown };

  if (fetchError || !widget) {
    return { widget: null, error: "NOT_FOUND" as const };
  }

  // プロジェクトのオーナーチェック（RLS + user_id チェック）
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", widget.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!project) {
    return { widget: null, error: "FORBIDDEN" as const };
  }

  return { widget, error: null };
}

// PATCH /api/widgets/:id - ウィジェット更新
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
  const parsed = updateWidgetSchema.safeParse(body);
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

  const { id: widgetId } = await params;

  // 存在確認とオーナーチェック
  const { widget, error: checkError } = await getWidgetWithOwnerCheck(
    supabase,
    widgetId,
    user.id
  );

  if (checkError === "NOT_FOUND") {
    return NextResponse.json(
      { error: "ウィジェットが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (checkError === "FORBIDDEN" || !widget) {
    return NextResponse.json(
      { error: "アクセス権限がありません", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // タイプ変更時のプラン制限チェック (要件5 AC-8,9): Freeプランは Wall of Love のみ
  const newType = parsed.data.type;
  if (newType !== undefined && newType !== "wall") {
    const plan = await getUserPlan(user.id);
    if (plan === "free") {
      return NextResponse.json(
        {
          error: "Freeプランでは Wall of Love タイプのみ利用できます。Proプランにアップグレードしてください。",
          code: "PLAN_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }
  }

  // 更新データを構築（config はマージして更新）
  const updateData: WidgetUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (newType !== undefined) {
    updateData.type = newType as WidgetType;
  }

  if (parsed.data.config !== undefined) {
    // 既存 config とマージ
    const existingConfig = (widget.config as Record<string, unknown>) ?? {};
    updateData.config = { ...existingConfig, ...parsed.data.config } as Json;
  }

  // 更新実行
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedWidget, error: updateError } = await (supabase.from("widgets") as any)
    .update(updateData)
    .eq("id", widgetId)
    .select()
    .single() as { data: WidgetRow | null; error: { message?: string } | null };

  if (updateError) {
    return NextResponse.json(
      { error: "ウィジェットの更新に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedWidget);
}

// DELETE /api/widgets/:id - ウィジェット削除
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

  const { id: widgetId } = await params;

  // 存在確認とオーナーチェック
  const { widget, error: checkError } = await getWidgetWithOwnerCheck(
    supabase,
    widgetId,
    user.id
  );

  if (checkError === "NOT_FOUND") {
    return NextResponse.json(
      { error: "ウィジェットが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (checkError === "FORBIDDEN" || !widget) {
    return NextResponse.json(
      { error: "アクセス権限がありません", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // 削除実行
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase.from("widgets") as any)
    .delete()
    .eq("id", widgetId) as { error: { message?: string } | null };

  if (deleteError) {
    return NextResponse.json(
      { error: "ウィジェットの削除に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
