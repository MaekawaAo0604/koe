"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/shared/copy-button";

interface WallOfLoveUrlCopyProps {
  slug: string;
}

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://koe.example.com"
).replace(/\/+$/, "");

export function WallOfLoveUrlCopy({ slug }: WallOfLoveUrlCopyProps) {
  const wallUrl = `${APP_URL}/wall/${slug}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wall of Love 公開ページ</CardTitle>
        <CardDescription>
          承認済みテスティモニアルをまとめた専用の公開ページURLです。このURLを共有してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="bg-muted rounded-md p-3 overflow-x-auto">
            <code
              className="text-xs font-mono break-all text-foreground"
              data-testid="wall-url"
            >
              {wallUrl}
            </code>
          </div>
          <CopyButton text={wallUrl} label="URLをコピー" />
        </div>
      </CardContent>
    </Card>
  );
}
