import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { PoweredByBadge } from "@/components/shared/powered-by-badge";
import { cn } from "@/lib/utils";
import type { PlanType } from "@/types/database";
import type { TestimonialPublic } from "@/types/index";

// ISR: 60秒ごとに再生成
export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export default async function WallOfLovePage({ params }: Params) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  // slugでプロジェクトを取得（要件6 AC-1: /wall/:slug の公開URL）
  const { data: projectRow } = await supabase
    .from("projects")
    .select("id, name, slug, logo_url, brand_color, user_id")
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

  // 承認済みテスティモニアルを取得（author_email除外）（要件6 AC-2, 要件9 AC-4）
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select(
      "id, author_name, author_title, author_company, author_avatar_url, rating, content, created_at"
    )
    .eq("project_id", projectRow.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const typedTestimonials = (testimonials ?? []) as unknown as TestimonialPublic[];

  return (
    <div className="min-h-screen bg-muted/40">
      {/* ヘッダー */}
      <header className="bg-background border-b py-10 px-4">
        <div className="max-w-6xl mx-auto text-center">
          {projectRow.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={projectRow.logo_url}
              alt={`${projectRow.name} ロゴ`}
              className="w-16 h-16 mx-auto rounded-lg object-contain mb-4"
            />
          )}
          <h1 className="text-3xl font-bold">{projectRow.name}</h1>
          <p className="text-muted-foreground mt-2">お客様の声</p>
        </div>
      </header>

      {/* テスティモニアルグリッド（要件6 AC-2: 承認済みをグリッド形式で表示）*/}
      <main className="max-w-6xl mx-auto py-12 px-4">
        {typedTestimonials.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            まだテスティモニアルがありません。
          </p>
        ) : (
          <div
            className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-gap:1rem]"
            data-testid="testimonials-grid"
          >
            {typedTestimonials.map((t) => (
              <WallCard key={t.id} testimonial={t} />
            ))}
          </div>
        )}
      </main>

      {/* Powered by Koe バッジ（Freeプランのみ）（要件6 AC-3, 要件10 AC-1） */}
      {plan === "free" && (
        <div className="pb-8">
          <PoweredByBadge utmSource="wall" />
        </div>
      )}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`評価: ${rating}星`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-4 h-4",
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function WallCard({ testimonial }: { testimonial: TestimonialPublic }) {
  return (
    <div
      className="break-inside-avoid mb-4 bg-background border rounded-xl p-5 shadow-sm"
      data-testid="wall-card"
    >
      <StarRating rating={testimonial.rating} />
      <p className="mt-3 text-sm leading-relaxed text-foreground">
        &ldquo;{testimonial.content}&rdquo;
      </p>
      <div className="flex items-center gap-3 mt-4">
        {testimonial.author_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={testimonial.author_avatar_url}
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0"
            aria-hidden="true"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0"
            aria-hidden="true"
          >
            {testimonial.author_name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{testimonial.author_name}</p>
          {(testimonial.author_title || testimonial.author_company) && (
            <p className="text-xs text-muted-foreground truncate">
              {[testimonial.author_title, testimonial.author_company]
                .filter(Boolean)
                .join(" / ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
