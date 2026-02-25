"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProjectSchema } from "@/lib/validators/project";
import { getUserPlan, getProjectLimit, isAtLimit } from "@/lib/plan";
import { generateSlug } from "@/lib/utils";
import type { Database } from "@/types/database";

export interface CreateProjectState {
  error: string | null;
  fieldErrors?: Partial<Record<string, string[]>>;
}

export async function createProject(
  _prevState: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "認証が必要です" };
  }

  const rawName = formData.get("name");
  const rawSlug = formData.get("slug");
  const rawBrandColor = formData.get("brand_color");

  const parsed = createProjectSchema.safeParse({
    name: rawName,
    slug: rawSlug && (rawSlug as string).trim() !== "" ? rawSlug : undefined,
    brand_color:
      rawBrandColor && (rawBrandColor as string).trim() !== ""
        ? rawBrandColor
        : undefined,
  });

  if (!parsed.success) {
    return {
      error: "入力内容に誤りがあります",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<string, string[]>
      >,
    };
  }

  const { name, slug: slugInput, brand_color } = parsed.data;

  // プラン制限チェック
  const plan = await getUserPlan(user.id);
  const projectLimit = getProjectLimit(plan);

  if (projectLimit !== Infinity) {
    const { count, error: countError } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      return { error: "プロジェクト数の確認に失敗しました" };
    }

    if (isAtLimit(count ?? 0, projectLimit)) {
      return {
        error: `Freeプランではプロジェクトを${projectLimit}つまでしか作成できません。Proプランにアップグレードしてください。`,
      };
    }
  }

  // スラッグ解決（指定なし → 名前から自動生成 → 重複時はサフィックス付与）
  const baseSlug = slugInput ?? generateSlug(name);
  const slug = await resolveUniqueSlug(supabase, baseSlug);

  // プロジェクト作成
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase.from("projects") as any)
    .insert({
      user_id: user.id,
      name,
      slug,
      brand_color,
    })
    .select()
    .single() as {
    data: Database["public"]["Tables"]["projects"]["Row"] | null;
    error: { code: string } | null;
  };

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        error: "指定されたスラッグはすでに使用されています",
        fieldErrors: { slug: ["このスラッグはすでに使用されています"] },
      };
    }
    return { error: "プロジェクトの作成に失敗しました。もう一度お試しください。" };
  }

  redirect("/dashboard");
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

    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return `project-${Math.random().toString(36).slice(2, 8)}`;
}
