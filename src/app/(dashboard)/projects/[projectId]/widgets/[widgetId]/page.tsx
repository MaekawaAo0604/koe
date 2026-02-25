import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { WidgetSettingsPanel } from "@/components/widgets/widget-settings-panel";
import type { Widget, WidgetConfig, TestimonialPublic } from "@/types/index";

type Params = { params: Promise<{ projectId: string; widgetId: string }> };

const DEFAULT_CONFIG: WidgetConfig = {
  theme: "light",
  show_rating: true,
  show_date: true,
  show_avatar: true,
  max_items: 10,
  columns: 3,
  border_radius: 8,
  shadow: true,
  font_family: "inherit",
};

export const metadata: Metadata = {
  title: "ウィジェット設定",
  robots: { index: false, follow: false },
};

export default async function WidgetSettingsPage({ params }: Params) {
  const { projectId, widgetId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // プロジェクトのオーナー確認（RLS）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from("projects")
    .select("id, name, slug")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single() as { data: { id: string; name: string; slug: string } | null };

  if (!project) {
    notFound();
  }

  // ウィジェット取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: widget } = await (supabase as any)
    .from("widgets")
    .select("*")
    .eq("id", widgetId)
    .eq("project_id", projectId)
    .single() as { data: Widget | null };

  if (!widget) {
    notFound();
  }

  // configのデフォルト値補完
  const safeConfig: WidgetConfig = {
    ...DEFAULT_CONFIG,
    ...(widget.config as Partial<WidgetConfig> | null ?? {}),
  };

  const typedWidget: Widget = { ...widget, config: safeConfig };

  // プラン取得
  const plan = await getUserPlan(user.id);

  // 承認済みテスティモニアル取得（プレビュー用、最大20件）
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select(
      "id, author_name, author_title, author_company, author_avatar_url, rating, content, created_at"
    )
    .eq("project_id", projectId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);

  const typedTestimonials = (testimonials ?? []) as unknown as TestimonialPublic[];

  return (
    <div className="max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" asChild className="-ml-2">
          <Link href={`/projects/${projectId}/widgets`}>
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            ウィジェット一覧
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">ウィジェット設定</h1>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
      </div>

      {/* メインコンテンツ（フォーム + プレビュー + 埋め込みコード） */}
      <WidgetSettingsPanel
        widget={typedWidget}
        plan={plan}
        testimonials={typedTestimonials}
        projectId={projectId}
        slug={project.slug}
      />
    </div>
  );
}
