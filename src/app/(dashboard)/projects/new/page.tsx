import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, getProjectLimit, isAtLimit, FREE_PLAN_PROJECT_LIMIT } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectCreateForm } from "@/components/dashboard/project-create-form";

export default async function NewProjectPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // プラン・プロジェクト数を取得してプラン制限チェック
  const plan = await getUserPlan(user.id);
  const projectLimit = getProjectLimit(plan);

  let atLimit = false;
  if (projectLimit !== Infinity) {
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    atLimit = isAtLimit(count ?? 0, projectLimit);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 戻るボタン */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            ダッシュボードに戻る
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-6">新しいプロジェクト作成</h1>

      {atLimit ? (
        /* Freeプラン制限: アップグレード促進UI */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" aria-hidden="true" />
              プロジェクト数の上限に達しました
            </CardTitle>
            <CardDescription>
              Freeプランでは{FREE_PLAN_PROJECT_LIMIT}
              つまでプロジェクトを作成できます。
              Proプランにアップグレードすると、プロジェクトを無制限に作成できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-semibold">Proプランの特典</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ プロジェクト無制限</li>
                <li>✓ テスティモニアル無制限収集</li>
                <li>✓ 「Powered by Koe」バッジ非表示</li>
                <li>✓ 全ウィジェットタイプ利用可能（カルーセル・リスト）</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/billing">
                  <Zap className="w-4 h-4 mr-2" aria-hidden="true" />
                  Proにアップグレード（¥980/月）
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">ダッシュボードに戻る</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* プロジェクト作成フォーム */
        <ProjectCreateForm />
      )}
    </div>
  );
}
