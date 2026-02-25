import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary mb-4" aria-hidden="true">
          404
        </p>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          ページが見つかりません
        </h1>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          お探しのページは存在しないか、移動または削除された可能性があります。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">ホームへ戻る</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">ダッシュボードへ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
