"use client";

import { useState } from "react";
import { WidgetConfigForm } from "./widget-config-form";
import { WidgetPreview } from "./widget-preview";
import { EmbedCodeCopy } from "./embed-code-copy";
import { PlatformGuide } from "./platform-guide";
import { WallOfLoveUrlCopy } from "./wall-of-love-url-copy";
import type { Widget, WidgetType, WidgetConfig, PlanType, TestimonialPublic } from "@/types/index";

interface WidgetSettingsPanelProps {
  widget: Widget;
  plan: PlanType;
  testimonials: TestimonialPublic[];
  projectId: string;
  slug: string;
}

export function WidgetSettingsPanel({
  widget,
  plan,
  testimonials,
  projectId,
  slug,
}: WidgetSettingsPanelProps) {
  const [previewType, setPreviewType] = useState<WidgetType>(widget.type);
  const [previewConfig, setPreviewConfig] = useState<WidgetConfig>(widget.config);

  function handleChange(type: WidgetType, config: WidgetConfig) {
    setPreviewType(type);
    setPreviewConfig(config);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左カラム: 設定フォーム */}
      <div className="space-y-4">
        <WidgetConfigForm
          widgetId={widget.id}
          type={widget.type}
          config={widget.config}
          plan={plan}
          onChange={handleChange}
        />
        <EmbedCodeCopy projectId={projectId} widgetId={widget.id} />
        <PlatformGuide />
        {/* Wall of Love 公開ページ URLコピー（要件6 AC-4） */}
        <WallOfLoveUrlCopy slug={slug} />
      </div>

      {/* 右カラム: プレビュー */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-medium mb-2">リアルタイムプレビュー</h2>
          <p className="text-xs text-muted-foreground mb-3">
            設定を変更すると即座にプレビューに反映されます。
            {testimonials.length === 0 && " 現在、承認済みテスティモニアルがないためサンプルデータを表示しています。"}
          </p>
        </div>
        <WidgetPreview
          type={previewType}
          config={previewConfig}
          testimonials={testimonials}
        />
      </div>
    </div>
  );
}
