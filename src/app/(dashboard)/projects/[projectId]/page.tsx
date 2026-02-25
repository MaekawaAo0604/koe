import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { TestimonialList } from "@/components/testimonials/testimonial-list";
import { TestimonialFilters } from "@/components/testimonials/testimonial-filters";
import { UsageIndicator } from "@/components/testimonials/usage-indicator";
import type { Testimonial, TestimonialStatus, Project } from "@/types/index";

type Params = { params: Promise<{ projectId: string }> };
type SearchParams = {
  searchParams: Promise<{
    status?: string;
    rating?: string;
    tags?: string;
  }>;
};

export default async function ProjectTestimonialsPage({
  params,
  searchParams,
}: Params & SearchParams) {
  const { projectId } = await params;
  const filters = await searchParams;

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

  // テスティモニアル一覧取得（フィルタ適用 + 作成日時降順）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("testimonials")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const validStatuses: TestimonialStatus[] = ["pending", "approved", "rejected"];
  if (filters.status && validStatuses.includes(filters.status as TestimonialStatus)) {
    query = query.eq("status", filters.status);
  }

  if (filters.rating) {
    const r = Number(filters.rating);
    if (Number.isInteger(r) && r >= 1 && r <= 5) {
      query = query.eq("rating", r);
    }
  }

  if (filters.tags) {
    const tags = filters.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      query = query.overlaps("tags", tags);
    }
  }

  const { data: testimonials } = await query;
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
            <p className="text-sm text-muted-foreground font-mono">
              /f/{typedProject.slug}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link href={`/projects/${projectId}/settings`}>
            <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
            設定
          </Link>
        </Button>
      </div>

      {/* 件数表示（Freeプラン時 — 要件4 AC-8）*/}
      <div className="mb-4">
        <UsageIndicator current={totalCount ?? 0} plan={plan} />
      </div>

      {/* フィルタ UI — TestimonialFilters は useSearchParams() を使用するため
          Suspense boundary が必要（実装ルール8）*/}
      <div className="mb-6">
        <Suspense
          fallback={
            <div
              className="h-24 animate-pulse rounded-lg bg-muted"
              aria-hidden="true"
            />
          }
        >
          <TestimonialFilters availableTags={allTags} />
        </Suspense>
      </div>

      {/* テスティモニアル一覧 */}
      <TestimonialList initialTestimonials={typedTestimonials} />
    </div>
  );
}
