import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createProjectSchema } from "@/lib/validators/project";
import { getUserPlan, getProjectLimit, isAtLimit } from "@/lib/plan";
import { generateSlug } from "@/lib/utils";
import type { Database } from "@/types/database";

// GET /api/projects - プロジェクト一覧 + テスティモニアル件数
export async function GET() {
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

  // Relationships が Database 型未定義のため明示的にキャスト
  type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
  type ProjectWithTestimonials = ProjectRow & { testimonials: { count: number }[] | null };

  const { data: rawData, error } = await supabase
    .from("projects")
    .select("*, testimonials(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "プロジェクトの取得に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  const projects = rawData as ProjectWithTestimonials[] | null;

  // テスティモニアル件数をフラットに変換
  const projectsWithCount = (projects ?? []).map((p) => {
    const testimonial_count = p.testimonials?.[0]?.count ?? 0;
    const { testimonials: _t, ...rest } = p;
    return { ...rest, testimonial_count };
  });

  return NextResponse.json(projectsWithCount);
}

// POST /api/projects - プロジェクト作成
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
  const parsed = createProjectSchema.safeParse(body);
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

  const { name, slug: slugInput, brand_color } = parsed.data;

  // プラン制限チェック（有限の上限がある場合のみ）
  const plan = await getUserPlan(user.id);
  const projectLimit = getProjectLimit(plan);

  if (projectLimit !== Infinity) {
    const { count, error: countError } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      return NextResponse.json(
        { error: "プロジェクト数の確認に失敗しました", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    if (isAtLimit(count ?? 0, projectLimit)) {
      return NextResponse.json(
        {
          error: `Freeプランではプロジェクトを${projectLimit}つまでしか作成できません。Proプランにアップグレードしてください。`,
          code: "PROJECT_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }
  }

  // スラッグ決定（指定なし → 名前から自動生成）
  const baseSlug = slugInput ?? generateSlug(name);
  const slug = await resolveUniqueSlug(supabase, baseSlug);

  // プロジェクト作成
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Supabase の型推論が SSR パッケージのバージョン不一致で `never` になる既知の問題を回避
  const { data: project, error: insertError } = await (supabase.from("projects") as any)
    .insert({
      user_id: user.id,
      name,
      slug,
      brand_color,
    })
    .select()
    .single() as { data: Database["public"]["Tables"]["projects"]["Row"] | null; error: { code: string } | null };

  if (insertError) {
    // スラッグ重複（一意性制約違反）
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          error: "指定されたスラッグはすでに使用されています",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "プロジェクトの作成に失敗しました", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json(project, { status: 201 });
}

/**
 * DBを確認しながら一意のスラッグを解決する。
 * 重複している場合はランダムサフィックスを付与して再試行する。
 */
async function resolveUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  const maxAttempts = 5;

  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;

    // 重複している場合はランダムサフィックスを付与
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // フォールバック: 完全にランダムなスラッグ
  return `project-${Math.random().toString(36).slice(2, 8)}`;
}
