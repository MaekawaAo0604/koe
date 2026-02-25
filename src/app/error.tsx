"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-destructive mb-4" aria-hidden="true">
          500
        </p>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          サーバーエラーが発生しました
        </h1>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          予期せぬエラーが発生しました。しばらく時間をおいてから再度お試しください。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>もう一度試す</Button>
          <Button variant="outline" asChild>
            <Link href="/">ホームへ戻る</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
