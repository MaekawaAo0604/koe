"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createProject,
  type CreateProjectState,
} from "@/app/(dashboard)/projects/new/actions";
import { generateSlug } from "@/lib/utils";

const initialState: CreateProjectState = { error: null };

export function ProjectCreateForm() {
  const [state, action, isPending] = useActionState(createProject, initialState);
  const slugRef = useRef<HTMLInputElement>(null);
  const slugManuallyEdited = useRef(false);
  const [brandColor, setBrandColor] = useState("#6366f1");

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited.current && slugRef.current) {
      slugRef.current.value = generateSlug(e.target.value);
    }
  }

  function handleSlugChange() {
    slugManuallyEdited.current = true;
  }

  function handleColorPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBrandColor(e.target.value);
  }

  function handleColorTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBrandColor(e.target.value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>プロジェクト情報</CardTitle>
        <CardDescription>
          テスティモニアルを収集するプロジェクトの基本情報を入力してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          {/* プロジェクト名 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              プロジェクト名 <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="例: 私のSaaSサービス"
              required
              autoComplete="off"
              onChange={handleNameChange}
            />
            {state.fieldErrors?.name && (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>

          {/* スラッグ */}
          <div className="space-y-2">
            <Label htmlFor="slug">スラッグ（URL）</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap select-none">
                /f/
              </span>
              <Input
                id="slug"
                name="slug"
                type="text"
                placeholder="my-saas-service"
                ref={slugRef}
                onChange={handleSlugChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              小文字英数字とハイフンのみ（3〜50文字）。プロジェクト名から自動生成されます。
            </p>
            {state.fieldErrors?.slug && (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.slug[0]}
              </p>
            )}
          </div>

          {/* ブランドカラー */}
          <div className="space-y-2">
            <Label htmlFor="brand_color">ブランドカラー</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="カラーピッカー"
                className="h-10 w-10 cursor-pointer rounded border p-0.5"
                value={brandColor}
                onChange={handleColorPickerChange}
              />
              <Input
                id="brand_color"
                name="brand_color"
                type="text"
                value={brandColor}
                onChange={handleColorTextChange}
                placeholder="#6366f1"
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              16進数カラーコード形式（例: #6366f1）
            </p>
            {state.fieldErrors?.brand_color && (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.brand_color[0]}
              </p>
            )}
          </div>

          {/* 全体エラー */}
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "作成中..." : "プロジェクトを作成"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
