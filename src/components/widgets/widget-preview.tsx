import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetType, WidgetConfig, TestimonialPublic } from "@/types/index";

interface WidgetPreviewProps {
  type: WidgetType;
  config: WidgetConfig;
  testimonials: TestimonialPublic[];
}

interface PreviewItemProps {
  testimonial: TestimonialPublic;
  config: WidgetConfig;
  isDark: boolean;
}

/** モックデータ（承認済みテスティモニアルがない場合に使用） */
export const PREVIEW_MOCK_TESTIMONIALS: TestimonialPublic[] = [
  {
    id: "mock-1",
    author_name: "田中 太郎",
    author_title: "CEO",
    author_company: "株式会社サンプル",
    author_avatar_url: null,
    rating: 5,
    content:
      "このサービスを使い始めてから業務効率が大幅に改善されました。チーム全員に推薦しています。",
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-2",
    author_name: "山田 花子",
    author_title: "デザイナー",
    author_company: "クリエイティブ株式会社",
    author_avatar_url: null,
    rating: 5,
    content:
      "直感的なUIで使いやすく、サポートも丁寧です。導入して本当に良かったと思っています。",
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-3",
    author_name: "鈴木 一郎",
    author_title: "エンジニア",
    author_company: "テック株式会社",
    author_avatar_url: null,
    rating: 4,
    content: "API連携が簡単で、開発工数を大幅に削減できました。とても気に入っています。",
    created_at: new Date().toISOString(),
  },
];

function StarRating({
  rating,
  isDark,
}: {
  rating: number;
  isDark: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3 h-3",
            i < rating
              ? "fill-amber-400 text-amber-400"
              : isDark
              ? "fill-gray-600 text-gray-600"
              : "fill-gray-200 text-gray-200"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial, config, isDark }: PreviewItemProps) {
  return (
    <div
      className={cn(
        "p-3 text-xs",
        config.shadow && "shadow-sm",
        isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
      )}
      style={{ borderRadius: `${config.border_radius}px` }}
    >
      {config.show_rating && (
        <div className="mb-2">
          <StarRating rating={testimonial.rating} isDark={isDark} />
        </div>
      )}
      <p
        className={cn(
          "leading-relaxed mb-2",
          isDark ? "text-gray-200" : "text-gray-700"
        )}
      >
        &ldquo;{testimonial.content}&rdquo;
      </p>
      <div className="flex items-center gap-2">
        {config.show_avatar && (
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
              isDark ? "bg-gray-600 text-gray-200" : "bg-gray-200 text-gray-600"
            )}
            aria-hidden="true"
          >
            {testimonial.author_name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p
            className={cn(
              "font-medium truncate",
              isDark ? "text-gray-100" : "text-gray-900"
            )}
          >
            {testimonial.author_name}
          </p>
          {(testimonial.author_title || testimonial.author_company) && (
            <p
              className={cn(
                "truncate",
                isDark ? "text-gray-400" : "text-gray-500"
              )}
            >
              {[testimonial.author_title, testimonial.author_company]
                .filter(Boolean)
                .join(" / ")}
            </p>
          )}
        </div>
      </div>
      {config.show_date && (
        <p
          className={cn(
            "mt-1.5",
            isDark ? "text-gray-500" : "text-gray-400"
          )}
        >
          {new Date(testimonial.created_at).toLocaleDateString("ja-JP")}
        </p>
      )}
    </div>
  );
}

function WallLayout({
  items,
  config,
  isDark,
}: {
  items: TestimonialPublic[];
  config: WidgetConfig;
  isDark: boolean;
}) {
  const cols = Math.min(config.columns, 3); // プレビュー用に最大3列
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {items.map((t) => (
        <TestimonialCard key={t.id} testimonial={t} config={config} isDark={isDark} />
      ))}
    </div>
  );
}

function CarouselLayout({
  items,
  config,
  isDark,
}: {
  items: TestimonialPublic[];
  config: WidgetConfig;
  isDark: boolean;
}) {
  const item = items[0];
  if (!item) return null;
  return (
    <div className="relative">
      <TestimonialCard testimonial={item} config={config} isDark={isDark} />
      <div className="flex justify-center gap-1.5 mt-3">
        {items.map((t, i) => (
          <div
            key={t.id}
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              i === 0
                ? "bg-primary"
                : isDark
                ? "bg-gray-600"
                : "bg-gray-300"
            )}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function ListLayout({
  items,
  config,
  isDark,
}: {
  items: TestimonialPublic[];
  config: WidgetConfig;
  isDark: boolean;
}) {
  return (
    <div className="space-y-2">
      {items.map((t) => (
        <TestimonialCard key={t.id} testimonial={t} config={config} isDark={isDark} />
      ))}
    </div>
  );
}

const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  wall: "Wall of Love",
  carousel: "カルーセル",
  list: "リスト",
};

export function WidgetPreview({ type, config, testimonials }: WidgetPreviewProps) {
  const isDark = config.theme === "dark";
  const displayItems = (testimonials.length > 0 ? testimonials : PREVIEW_MOCK_TESTIMONIALS).slice(
    0,
    Math.min(config.max_items, 6) // プレビューは最大6件
  );
  const isMock = testimonials.length === 0;

  return (
    <div
      className={cn(
        "rounded-lg p-4 border overflow-hidden",
        isDark ? "bg-gray-950 border-gray-800" : "bg-gray-50 border-gray-200"
      )}
      style={{
        fontFamily: config.font_family !== "inherit" ? config.font_family : undefined,
      }}
      data-testid="widget-preview"
    >
      {/* ヘッダー */}
      <div
        className={cn(
          "text-xs font-medium mb-3 text-center",
          isDark ? "text-gray-500" : "text-gray-400"
        )}
      >
        {WIDGET_TYPE_LABELS[type]} プレビュー
        {isMock && (
          <span className="ml-1 text-xs opacity-70">（サンプルデータ）</span>
        )}
      </div>

      {/* コンテンツ */}
      {type === "wall" ? (
        <WallLayout items={displayItems} config={config} isDark={isDark} />
      ) : type === "carousel" ? (
        <CarouselLayout items={displayItems} config={config} isDark={isDark} />
      ) : (
        <ListLayout items={displayItems} config={config} isDark={isDark} />
      )}
    </div>
  );
}
