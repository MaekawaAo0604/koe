import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateProjectSchema } from "@/lib/validators/project";
import type { Database, Json } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id - プロジェクト詳細取得
export async function GET(_request: NextRequest, { params }: Params) {
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

  const { id } = await params;

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: "プロジェクトが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json(project);
}

// PATCH /api/projects/:id - プロジェクト更新
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
  const parsed = updateProjectSchema.safeParse(body);
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

  const { id } = await params;

  // 更新実行（RLSによりuser_id一致のみ更新される）
  // form_config は Zod 型と Database Json 型の互換性のため明示的にキャスト
  const updateData: Database["public"]["Tables"]["projects"]["Update"] = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    brand_color: parsed.data.brand_color,
    logo_url: parsed.data.logo_url,
    form_config: parsed.data.form_config as Json | undefined,
    updated_at: new Date().toISOString(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Supabase の型推論が Json 型の再帰構造で `never` になる既知の問題を回避
  const { data: project, error: updateError } = await (supabase
    .from("projects") as any)
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single() as { data: Database["public"]["Tables"]["projects"]["Row"] | null; error: { code: string } | null };

  if (updateError) {
    // スラッグ重複（一意性制約違反）
    if (updateError.code === "23505") {
      return NextResponse.json(
        {
          error: "指定されたスラッグはすでに使用されています",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "プロジェクトの更新に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  if (!project) {
    return NextResponse.json(
      { error: "プロジェクトが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json(project);
}

// DELETE /api/projects/:id - プロジェクト削除（カスケード）
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

  const { id } = await params;

  // 対象プロジェクトの存在確認（オーナーチェック）
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "プロジェクトが見つかりません", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // 削除実行（DBのCASCADE制約によりtestimonials, widgetsも削除される）
  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: "プロジェクトの削除に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
