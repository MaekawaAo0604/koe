import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "./project-card";
import type { ProjectWithCount } from "@/types/index";

interface ProjectListProps {
  projects: ProjectWithCount[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <PlusCircle className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-1">プロジェクトがありません</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          最初のプロジェクトを作成して、顧客の声を収集しましょう
        </p>
        <Button asChild>
          <Link href="/projects/new">
            <PlusCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            プロジェクトを作成する
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  );
}
