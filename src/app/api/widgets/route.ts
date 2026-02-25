import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWidgetSchema } from "@/lib/validators/widget";
import { getUserPlan } from "@/lib/plan";
import type { Database, Json, WidgetType } from "@/types/database";

type WidgetRow = Database["public"]["Tables"]["widgets"]["Row"];

// POST /api/widgets - ウィジェット作成
export async function POST(request: NextRequest) {
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
  const parsed = createWidgetSchema.safeParse(body);
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

  const { project_id, type, config } = parsed.data;

  // プロジェクトの存在確認とオーナーチェック (RLSによる保護)
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "プロジェクトが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // プラン制限チェック (要件5 AC-8,9): Freeプランは Wall of Love のみ
  const plan = await getUserPlan(user.id);
  if (plan === "free" && type !== "wall") {
    return NextResponse.json(
      {
        error: "Freeプランでは Wall of Love タイプのみ利用できます。Proプランにアップグレードしてください。",
        code: "PLAN_LIMIT_REACHED",
      },
      { status: 403 }
    );
  }

  // ウィジェット作成
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: widget, error: insertError } = await (supabase.from("widgets") as any)
    .insert({
      project_id,
      type: type as WidgetType,
      ...(config ? { config: config as Json } : {}),
    })
    .select()
    .single() as { data: WidgetRow | null; error: { message?: string } | null };

  if (insertError) {
    return NextResponse.json(
      { error: "ウィジェットの作成に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json(widget, { status: 201 });
}
