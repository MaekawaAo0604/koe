import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProjectSettingsForm } from "@/components/dashboard/project-settings-form";
import type { Project } from "@/types/index";

type Params = { params: Promise<{ projectId: string }> };

export default async function ProjectSettingsPage({ params }: Params) {
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

  // Database型からドメイン型へキャスト
  const typedProject = project as unknown as Project;

  return (
    <div className="max-w-2xl mx-auto">
      {/* 戻るボタン */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="-ml-2">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            プロジェクトに戻る
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-6">プロジェクト設定</h1>

      <ProjectSettingsForm project={typedProject} />
    </div>
  );
}
