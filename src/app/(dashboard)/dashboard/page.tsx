import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">プロジェクト</h1>
          <p className="text-muted-foreground mt-1">
            テスティモニアル収集プロジェクトを管理します
          </p>
        </div>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" aria-hidden="true" />
          新しいプロジェクト
        </Button>
      </div>

      {/* 空状態 */}
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <PlusCircle className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-1">プロジェクトがありません</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          最初のプロジェクトを作成して、顧客の声を収集しましょう
        </p>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" aria-hidden="true" />
          プロジェクトを作成する
        </Button>
      </div>
    </div>
  );
}
