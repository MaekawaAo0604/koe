"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProjectSchema } from "@/lib/validators/project";
import type { Database } from "@/types/database";

export interface UpdateProjectSettingsState {
  error: string | null;
  success?: boolean;
  fieldErrors?: Partial<Record<string, string[]>>;
}

// プロジェクト設定更新アクション
export async function updateProjectSettings(
  projectId: string,
  _prevState: UpdateProjectSettingsState,
  formData: FormData
): Promise<UpdateProjectSettingsState> {
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
  const logoFile = formData.get("logo") as File | null;

  // バリデーション
  const parsed = updateProjectSchema.safeParse({
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

  let logo_url: string | null | undefined;

  // ロゴファイルのアップロード処理
  if (logoFile && logoFile.size > 0) {
    // ファイルサイズチェック（5MB以下: 要件9 AC-8）
    if (logoFile.size > 5 * 1024 * 1024) {
      return { error: "ロゴ画像は5MB以下のファイルを選択してください" };
    }

    const fileExt = logoFile.name.split(".").pop() ?? "png";
    const filePath = `${user.id}/${projectId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, logoFile, { upsert: true });

    if (uploadError) {
      return { error: "ロゴのアップロードに失敗しました。もう一度お試しください。" };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(filePath);

    logo_url = publicUrl;
  }

  // プロジェクト更新データ組み立て
  type UpdateData = Database["public"]["Tables"]["projects"]["Update"];
  const updateData: UpdateData = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    brand_color: parsed.data.brand_color,
    updated_at: new Date().toISOString(),
  };

  if (logo_url !== undefined) {
    updateData.logo_url = logo_url;
  }

  // 更新実行（RLSによりオーナーのみ更新可能）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("projects") as any)
    .update(updateData)
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (updateError) {
    // スラッグ重複（一意性制約違反）
    if ((updateError as { code: string }).code === "23505") {
      return {
        error: "指定されたスラッグはすでに使用されています",
        fieldErrors: { slug: ["このスラッグはすでに使用されています"] },
      };
    }

    return { error: "設定の更新に失敗しました。もう一度お試しください。" };
  }

  return { error: null, success: true };
}

// プロジェクト削除アクション（カスケード削除: 要件2 AC-5）
export async function deleteProject(projectId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("認証が必要です");
  }

  // オーナー確認
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    throw new Error("プロジェクトが見つかりません");
  }

  // 削除実行（DBのCASCADE制約によりtestimonials, widgetsも削除される）
  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error("プロジェクトの削除に失敗しました");
  }

  redirect("/dashboard");
}
