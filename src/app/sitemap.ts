import type { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const now = new Date();

  // 静的ページ
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${appUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${appUrl}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Wall of Love 公開ページ（動的）
  let wallRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServiceRoleClient();
    const { data: projects } = await supabase
      .from("projects")
      .select("slug, updated_at");

    if (projects) {
      wallRoutes = projects.map((project) => ({
        url: `${appUrl}/wall/${project.slug}`,
        lastModified: new Date(project.updated_at),
        changeFrequency: "daily" as const,
        priority: 0.6,
      }));
    }
  } catch {
    // DB 接続失敗時は静的ページのみ返す
  }

  return [...staticRoutes, ...wallRoutes];
}
