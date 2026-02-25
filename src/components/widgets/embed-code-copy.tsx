"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/shared/copy-button";

interface EmbedCodeCopyProps {
  projectId: string;
  widgetId: string;
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://koe.example.com";

export function EmbedCodeCopy({ projectId, widgetId }: EmbedCodeCopyProps) {
  const embedCode = `<script src="${APP_URL}/widget.js" data-project="${projectId}" data-widget="${widgetId}"></script>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>埋め込みコード</CardTitle>
        <CardDescription>
          このコードをWebサイトのHTMLに貼り付けてウィジェットを表示します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="bg-muted rounded-md p-3 overflow-x-auto">
            <code
              className="text-xs font-mono break-all text-foreground"
              data-testid="embed-code"
            >
              {embedCode}
            </code>
          </div>
          <CopyButton text={embedCode} label="埋め込みコードをコピー" />
        </div>
      </CardContent>
    </Card>
  );
}
