import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, Code, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { TestimonialList } from "@/components/testimonials/testimonial-list";
import { TestimonialFilters } from "@/components/testimonials/testimonial-filters";
import { UsageIndicator } from "@/components/testimonials/usage-indicator";
import type { Testimonial, Project } from "@/types/index";

type Params = { params: Promise<{ projectId: string }> };

export const metadata: Metadata = {
  title: "テスティモニアル管理",
  robots: { index: false, follow: false },
};

export default async function ProjectTestimonialsPage({ params }: Params) {
  const { projectId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // プロジェクト取得（RLSによりオーナーのみ取得可能）
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    notFound();
  }

  const typedProject = project as unknown as Project;

  // ユーザーのプラン取得（Freeプラン件数表示 + author_email 表示判定）
  const plan = await getUserPlan(user.id);

  // テスティモニアル全件取得（フィルタはクライアント側で処理）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: testimonials } = await (supabase as any)
    .from("testimonials")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const typedTestimonials = (testimonials ?? []) as unknown as Testimonial[];

  // フィルタなしの全件数取得（UsageIndicator 用）
  const { count: totalCount } = await supabase
    .from("testimonials")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  // 全テスティモニアルのタグ収集（フィルタUI に使う）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allForTags } = await (supabase as any)
    .from("testimonials")
    .select("tags")
    .eq("project_id", projectId) as { data: { tags: string[] }[] | null };

  const allTags = [
    ...new Set(
      (allForTags ?? []).flatMap((t) => t.tags ?? [])
    ),
  ].sort() as string[];

  return (
    <div className="max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" asChild className="-ml-2 shrink-0">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              ダッシュボード
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{typedProject.name}</h1>
            <Link
              href={`/f/${typedProject.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground font-mono hover:underline"
            >
              /f/{typedProject.slug} ↗
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/widgets`}>
              <Code className="w-4 h-4 mr-2" aria-hidden="true" />
              ウィジェット
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/wall/${typedProject.slug}`} target="_blank" rel="noopener noreferrer">
              <Globe className="w-4 h-4 mr-2" aria-hidden="true" />
              Wall of Love
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/settings`}>
              <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
              設定
            </Link>
          </Button>
        </div>
      </div>

      {/* 件数表示（Freeプラン時 — 要件4 AC-8）*/}
      <div className="mb-4">
        <UsageIndicator current={totalCount ?? 0} plan={plan} />
      </div>

      {/* フィルタ UI */}
      <div className="mb-6">
        <TestimonialFilters availableTags={allTags} />
      </div>

      {/* テスティモニアル一覧 */}
      <TestimonialList initialTestimonials={typedTestimonials} />
    </div>
  );
}
