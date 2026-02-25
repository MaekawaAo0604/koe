import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CollectionForm } from "@/components/forms/collection-form";
import { PoweredByBadge } from "@/components/shared/powered-by-badge";
import type { Project } from "@/types/index";
import type { PlanType } from "@/types/database";

// ISR: 60秒ごとに再生成（要件3 AC-1: 1秒以内の表示 + キャッシュ戦略）
export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("slug", slug)
    .single();

  if (!project) {
    return { title: "フォームが見つかりません" };
  }

  return {
    title: { absolute: `${project.name} - ご感想をお聞かせください` },
    description: `${project.name}のテスティモニアル収集フォームです。ぜひあなたの声をお聞かせください。`,
    robots: { index: false, follow: false },
  };
}

export default async function CollectionFormPage({ params }: Params) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  // スラッグでプロジェクトを取得（要件3 AC-9: 存在しないスラッグ → 404）
  const { data: projectRow } = await supabase
    .from("projects")
    .select("*, user_id")
    .eq("slug", slug)
    .single();

  if (!projectRow) {
    notFound();
  }

  // プロジェクトオーナーのプランを取得（バッジ表示判定用）
  const { data: userData } = await supabase
    .from("users")
    .select("plan")
    .eq("id", projectRow.user_id)
    .single();

  const plan: PlanType = (userData as { plan: PlanType } | null)?.plan ?? "free";

  // Database型からドメイン型へキャスト
  const project = projectRow as unknown as Project;

  return (
    <div
      className="min-h-screen bg-muted/40 py-12 px-4"
      style={
        {
          "--brand-color": project.brand_color,
        } as React.CSSProperties
      }
    >
      <div className="max-w-lg mx-auto">
        {/* ヘッダー: ロゴ + プロジェクト名 */}
        <div className="mb-8 text-center">
          {project.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logo_url}
              alt={`${project.name} ロゴ`}
              className="w-16 h-16 mx-auto rounded-lg object-contain mb-4"
            />
          )}
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground mt-1">
            ぜひあなたのご感想をお聞かせください
          </p>
        </div>

        {/* 収集フォーム */}
        <div className="bg-background rounded-xl shadow-sm border p-6">
          <CollectionForm project={project} />
        </div>

        {/* Powered by Koe バッジ（Freeプランのみ）（要件3 AC-4, 要件10 AC-1） */}
        {plan === "free" && <PoweredByBadge utmSource="form" />}
      </div>
    </div>
  );
}
