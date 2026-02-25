import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, ArrowUpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "ダッシュボード",
  robots: { index: false, follow: false },
};
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/dashboard/project-list";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, getProjectLimit, isAtLimit } from "@/lib/plan";
import type { Database } from "@/types/database";
import type { ProjectWithCount } from "@/types/index";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
  type ProjectWithTestimonials = ProjectRow & {
    testimonials: { count: number }[] | null;
  };

  const { data: rawData } = await supabase
    .from("projects")
    .select("*, testimonials(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const projects = rawData as ProjectWithTestimonials[] | null;

  const projectsWithCount: ProjectWithCount[] = (projects ?? []).map((p) => {
    const testimonial_count = p.testimonials?.[0]?.count ?? 0;
    const { testimonials: _t, ...rest } = p;
    return { ...rest, testimonial_count } as unknown as ProjectWithCount;
  });

  // プラン制限チェック（要件2 AC-6,7）
  const plan = await getUserPlan(user.id);
  const projectLimit = getProjectLimit(plan);
  const atProjectLimit =
    projectLimit !== Infinity && isAtLimit(projectsWithCount.length, projectLimit);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">プロジェクト</h1>
          <p className="text-muted-foreground mt-1">
            テスティモニアル収集プロジェクトを管理します
          </p>
        </div>
        {/* Freeプランで上限到達時はアップグレードボタンを表示（要件2 AC-6） */}
        {atProjectLimit ? (
          <Button asChild variant="outline" data-testid="upgrade-button-project-limit">
            <Link href="/billing">
              <ArrowUpCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              Proにアップグレード
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/projects/new">
              <PlusCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              新しいプロジェクト作成
            </Link>
          </Button>
        )}
      </div>

      {/* Freeプランの上限到達バナー（要件2 AC-6） */}
      {atProjectLimit && (
        <div
          className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800"
          role="status"
          data-testid="project-limit-banner"
        >
          <p className="text-sm font-medium">Freeプランのプロジェクト上限に達しました</p>
          <p className="text-xs mt-1">
            Freeプランでは{projectLimit}つまでプロジェクトを作成できます。
            <Link href="/billing" className="underline font-medium ml-1">
              Proプランにアップグレード
            </Link>
            すると無制限にプロジェクトを作成できます。
          </p>
        </div>
      )}

      <ProjectList projects={projectsWithCount} />
    </div>
  );
}
