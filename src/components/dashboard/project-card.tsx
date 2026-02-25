import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectWithCount } from "@/types/index";

interface ProjectCardProps {
  project: ProjectWithCount;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {project.brand_color && (
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.brand_color }}
                  aria-hidden="true"
                  data-testid="brand-color-indicator"
                />
              )}
              <CardTitle className="text-base truncate">{project.name}</CardTitle>
            </div>
            <ArrowRight
              className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
          <p className="text-xs text-muted-foreground font-mono">{project.slug}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              <Badge variant="secondary" className="text-xs">
                {project.testimonial_count}
              </Badge>
              <span className="ml-1.5">件のテスティモニアル</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
