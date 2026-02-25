import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/dashboard/project-list";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">プロジェクト</h1>
          <p className="text-muted-foreground mt-1">
            テスティモニアル収集プロジェクトを管理します
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <PlusCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            新しいプロジェクト作成
          </Link>
        </Button>
      </div>

      <ProjectList projects={projectsWithCount} />
    </div>
  );
}
