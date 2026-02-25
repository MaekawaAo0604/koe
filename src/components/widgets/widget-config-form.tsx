"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WidgetType, WidgetConfig, PlanType } from "@/types/index";

interface WidgetConfigFormProps {
  widgetId: string;
  type: WidgetType;
  config: WidgetConfig;
  plan: PlanType;
  onChange: (type: WidgetType, config: WidgetConfig) => void;
}

const WIDGET_TYPES: { value: WidgetType; label: string; description: string }[] = [
  {
    value: "wall",
    label: "Wall of Love",
    description: "グリッド形式で複数表示",
  },
  {
    value: "carousel",
    label: "カルーセル",
    description: "スライド形式で1件ずつ表示",
  },
  {
    value: "list",
    label: "リスト",
    description: "縦一列のリスト表示",
  },
];

const FONT_OPTIONS = [
  { value: "inherit", label: "サイトのフォントを継承" },
  { value: "sans-serif", label: "サンセリフ" },
  { value: "serif", label: "セリフ" },
  { value: "monospace", label: "等幅" },
];

export function WidgetConfigForm({
  widgetId,
  type: initialType,
  config: initialConfig,
  plan,
  onChange,
}: WidgetConfigFormProps) {
  const [type, setType] = useState<WidgetType>(initialType);
  const [config, setConfig] = useState<WidgetConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);

  const isPro = plan === "pro";

  function handleTypeChange(newType: WidgetType) {
    setType(newType);
    onChange(newType, config);
  }

  function handleConfigChange(updates: Partial<WidgetConfig>) {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(type, newConfig);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Freeプランの制限エラー
        if (res.status === 403) {
          toast.error(
            data.error ||
              "Freeプランでは Wall of Love タイプのみ利用できます。"
          );
          // 元のタイプに戻す
          setType(initialType);
          onChange(initialType, config);
          return;
        }
        throw new Error(data.error || "保存に失敗しました");
      }

      toast.success("ウィジェット設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ウィジェットタイプ選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ウィジェットタイプ</CardTitle>
          <CardDescription>
            表示スタイルを選択してください。
            {!isPro && (
              <span className="block mt-1 text-xs text-amber-600">
                Freeプランは Wall of Love のみ利用できます。
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {WIDGET_TYPES.map((wt) => {
              const isDisabled = !isPro && wt.value !== "wall";
              const isSelected = type === wt.value;
              return (
                <button
                  key={wt.value}
                  type="button"
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-md border text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent",
                    isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                  onClick={() => !isDisabled && handleTypeChange(wt.value)}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  data-testid={`widget-type-${wt.value}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{wt.label}</span>
                      {isDisabled && (
                        <Badge variant="secondary" className="text-xs">
                          Pro
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {wt.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 mt-0.5 shrink-0",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* デザイン設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">デザイン設定</CardTitle>
          <CardDescription>外観をカスタマイズします。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* テーマ */}
          <div className="space-y-1.5">
            <Label htmlFor="theme">テーマ</Label>
            <Select
              value={config.theme}
              onValueChange={(v) =>
                handleConfigChange({ theme: v as "light" | "dark" })
              }
            >
              <SelectTrigger id="theme" data-testid="select-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">ライト</SelectItem>
                <SelectItem value="dark">ダーク</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 表示件数 */}
          <div className="space-y-1.5">
            <Label htmlFor="max_items">表示件数 (1〜100)</Label>
            <Input
              id="max_items"
              type="number"
              min={1}
              max={100}
              value={config.max_items}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1 && v <= 100) {
                  handleConfigChange({ max_items: v });
                }
              }}
              data-testid="input-max-items"
            />
          </div>

          {/* カラム数（Wall of Love・リスト用） */}
          {(type === "wall" || type === "list") && (
            <div className="space-y-1.5">
              <Label htmlFor="columns">カラム数 (1〜4)</Label>
              <Select
                value={String(config.columns)}
                onValueChange={(v) =>
                  handleConfigChange({ columns: parseInt(v, 10) })
                }
              >
                <SelectTrigger id="columns" data-testid="select-columns">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} カラム
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 角丸 */}
          <div className="space-y-1.5">
            <Label htmlFor="border_radius">角丸 (0〜24px)</Label>
            <div className="flex items-center gap-3">
              <input
                id="border_radius"
                type="range"
                min={0}
                max={24}
                value={config.border_radius}
                onChange={(e) =>
                  handleConfigChange({
                    border_radius: parseInt(e.target.value, 10),
                  })
                }
                className="flex-1"
                data-testid="range-border-radius"
              />
              <span className="text-sm text-muted-foreground w-10 text-right">
                {config.border_radius}px
              </span>
            </div>
          </div>

          {/* フォント */}
          <div className="space-y-1.5">
            <Label htmlFor="font_family">フォント</Label>
            <Select
              value={config.font_family}
              onValueChange={(v) => handleConfigChange({ font_family: v })}
            >
              <SelectTrigger id="font_family" data-testid="select-font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 表示オプション（チェックボックス群） */}
          <div className="space-y-2">
            <p className="text-sm font-medium">表示オプション</p>
            {(
              [
                { key: "show_rating", label: "★評価を表示" },
                { key: "show_date", label: "投稿日時を表示" },
                { key: "show_avatar", label: "アバターを表示" },
                { key: "shadow", label: "シャドウを表示" },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[key]}
                  onChange={(e) =>
                    handleConfigChange({ [key]: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                  data-testid={`checkbox-${key}`}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full"
        data-testid="save-widget"
      >
        {isSaving ? "保存中..." : "設定を保存"}
      </Button>
    </div>
  );
}
