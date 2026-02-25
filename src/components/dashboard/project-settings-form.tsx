"use client";

import { useActionState, useTransition, useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/shared/copy-button";
import {
  updateProjectSettings,
  deleteProject,
  type UpdateProjectSettingsState,
} from "@/app/(dashboard)/projects/[projectId]/settings/actions";
import type { Project } from "@/types/index";
import { Upload, AlertTriangle } from "lucide-react";

interface ProjectSettingsFormProps {
  project: Project;
}

const initialState: UpdateProjectSettingsState = { error: null };

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const boundAction = updateProjectSettings.bind(null, project.id);
  const [state, action, isPending] = useActionState(boundAction, initialState);

  // 制御入力（フォームURL同期のためslugをstate管理）
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [brandColor, setBrandColor] = useState(project.brand_color);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    project.logo_url
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [formUrl, setFormUrl] = useState(`/f/${project.slug}`);

  // クライアントでフルURLを組み立て（SSR/CSRハイドレーション対策）
  useEffect(() => {
    setFormUrl(`${window.location.origin}/f/${slug}`);
  }, [slug]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteProject(project.id);
    });
  }

  return (
    <div className="space-y-6">
      {/* ─── 基本設定フォーム ─── */}
      <Card>
        <CardHeader>
          <CardTitle>基本設定</CardTitle>
          <CardDescription>
            プロジェクト名、スラッグ、ブランドカラー、ロゴを編集できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={action}
            className="space-y-6"
            encType="multipart/form-data"
          >
            {/* プロジェクト名 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                プロジェクト名 <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
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
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-project"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                小文字英数字とハイフンのみ（3〜50文字）
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
                  onChange={(e) => setBrandColor(e.target.value)}
                />
                <Input
                  id="brand_color"
                  name="brand_color"
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
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

            {/* ロゴ画像 */}
            <div className="space-y-2">
              <Label>ロゴ画像</Label>
              {logoPreview && (
                <div className="mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="ロゴプレビュー"
                    className="w-20 h-20 rounded border object-contain bg-muted"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="logo"
                  className="flex items-center gap-2 cursor-pointer px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent transition-colors"
                >
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  {logoPreview ? "ロゴを変更" : "ロゴをアップロード"}
                </Label>
                <input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                5MB以下の画像ファイル（PNG, JPG, SVGなど）
              </p>
            </div>

            {/* エラー / 成功メッセージ */}
            {state.error && (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}
            {state.success && (
              <p className="text-sm text-green-600" role="status">
                設定を保存しました
              </p>
            )}

            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "設定を保存"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── フォームURL ─── */}
      <Card>
        <CardHeader>
          <CardTitle>フォームURL</CardTitle>
          <CardDescription>
            このURLをお客様に共有してテスティモニアルを収集しましょう。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={formUrl}
              readOnly
              className="font-mono text-sm"
              aria-label="フォームURL"
            />
            <CopyButton text={formUrl} label="URLをコピー" />
          </div>
        </CardContent>
      </Card>

      {/* ─── 危険ゾーン ─── */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            危険ゾーン
          </CardTitle>
          <CardDescription>
            プロジェクトを削除すると、関連するすべてのテスティモニアルとウィジェットも削除されます。この操作は取り消せません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">プロジェクトを削除</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>プロジェクトを削除しますか？</DialogTitle>
                <DialogDescription>
                  プロジェクト「{project.name}
                  」とすべての関連データ（テスティモニアル・ウィジェット）が完全に削除されます。この操作は取り消せません。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  disabled={isDeleting}
                >
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "削除中..." : "削除する"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
