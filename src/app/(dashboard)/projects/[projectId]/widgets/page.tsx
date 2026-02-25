import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateWidgetButton } from "@/components/widgets/create-widget-button";
import type { Project, Widget } from "@/types/index";

type Params = { params: Promise<{ projectId: string }> };

const WIDGET_TYPE_LABELS: Record<string, string> = {
  wall: "Wall of Love",
  carousel: "カルーセル",
  list: "リスト",
};

const THEME_LABELS: Record<string, string> = {
  light: "ライト",
  dark: "ダーク",
};

export const metadata: Metadata = {
  title: "ウィジェット管理",
  robots: { index: false, follow: false },
};

export default async function WidgetsPage({ params }: Params) {
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

  // プラン取得
  const plan = await getUserPlan(user.id);

  // ウィジェット一覧取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: widgets } = await (supabase as any)
    .from("widgets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false }) as { data: Widget[] | null };

  const typedWidgets = (widgets ?? []) as Widget[];

  return (
    <div className="max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" asChild className="-ml-2 shrink-0">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              プロジェクトに戻る
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">ウィジェット</h1>
            <p className="text-sm text-muted-foreground">{typedProject.name}</p>
          </div>
        </div>
        <CreateWidgetButton projectId={projectId} />
      </div>

      {/* Freeプラン制限の説明 */}
      {plan === "free" && (
        <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
          <p className="text-sm font-medium mb-1">Freeプランのご利用中</p>
          <p className="text-xs">
            Freeプランでは <strong>Wall of Love</strong> タイプのみ利用できます。
            カルーセルやリスト表示は{" "}
            <Link href="/billing" className="underline font-medium">
              Proプランにアップグレード
            </Link>{" "}
            することで利用できます。
          </p>
        </div>
      )}

      {/* ウィジェット一覧 */}
      {typedWidgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <LayoutGrid className="w-12 h-12 mb-4 opacity-30" aria-hidden="true" />
            <p className="text-lg font-medium mb-1">ウィジェットがありません</p>
            <p className="text-sm text-center max-w-xs mb-4">
              「新しいウィジェットを作成」ボタンをクリックして、承認済みテスティモニアルを
              サイトに埋め込みましょう。
            </p>
            <CreateWidgetButton projectId={projectId} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {typedWidgets.map((widget) => {
            const config = widget.config as unknown as Record<string, unknown>;
            return (
              <Card key={widget.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {WIDGET_TYPE_LABELS[widget.type] ?? widget.type}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {THEME_LABELS[(config.theme as string) ?? "light"] ?? "ライト"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono truncate">
                    ID: {widget.id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span>表示件数: {(config.max_items as number) ?? 10}件</span>
                    {(widget.type === "wall" || widget.type === "list") && (
                      <span>カラム: {(config.columns as number) ?? 3}</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/projects/${projectId}/widgets/${widget.id}`}>
                      <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
                      設定・埋め込みコード
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
