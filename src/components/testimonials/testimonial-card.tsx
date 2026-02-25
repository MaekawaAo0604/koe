"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  X,
  Trash2,
  Tag,
  Edit2,
  Star,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { Testimonial } from "@/types/index";

interface TestimonialCardProps {
  testimonial: Testimonial;
  onUpdate: (updated: Testimonial) => void;
  onDelete: (id: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-green-200 bg-green-50 text-green-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "未審査",
  approved: "承認済み",
  rejected: "非承認",
};

export function TestimonialCard({
  testimonial,
  onUpdate,
  onDelete,
}: TestimonialCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(testimonial.author_name);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleStatusUpdate(status: "approved" | "rejected") {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/testimonials/${testimonial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated: Testimonial = await res.json();
      onUpdate(updated);
      toast.success(
        status === "approved" ? "承認しました" : "非承認にしました"
      );
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveName() {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === testimonial.author_name) {
      setIsEditingName(false);
      setEditedName(testimonial.author_name);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/testimonials/${testimonial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: trimmed }),
      });
      if (!res.ok) throw new Error();
      const updated: Testimonial = await res.json();
      onUpdate(updated);
      toast.success("表示名を更新しました");
      setIsEditingName(false);
    } catch {
      toast.error("更新に失敗しました");
      setEditedName(testimonial.author_name);
      setIsEditingName(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateTags(tags: string[]) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/testimonials/${testimonial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error();
      const updated: Testimonial = await res.json();
      onUpdate(updated);
    } catch {
      toast.error("タグの更新に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddTag() {
    const tag = newTag.trim();
    if (!tag || testimonial.tags.includes(tag)) {
      setIsAddingTag(false);
      setNewTag("");
      return;
    }
    await handleUpdateTags([...testimonial.tags, tag]);
    setIsAddingTag(false);
    setNewTag("");
  }

  async function handleRemoveTag(tagToRemove: string) {
    await handleUpdateTags(testimonial.tags.filter((t) => t !== tagToRemove));
  }

  async function handleDelete() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/testimonials/${testimonial.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onDelete(testimonial.id);
      toast.success("削除しました");
      setDeleteOpen(false);
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="relative">
      <CardContent className="pt-4">
        {/* ヘッダー: ステータス + 評価 + アクション */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* ステータスバッジ */}
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                STATUS_STYLES[testimonial.status]
              )}
              data-testid="status-badge"
            >
              {STATUS_LABELS[testimonial.status]}
            </span>

            {/* 星評価 */}
            <div
              className="flex items-center gap-0.5"
              aria-label={`評価: ${testimonial.rating}星`}
              data-testid="star-rating"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-3.5 h-3.5",
                    i < testimonial.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/25 fill-muted-foreground/10"
                  )}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-1 shrink-0">
            {testimonial.status !== "approved" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                onClick={() => handleStatusUpdate("approved")}
                disabled={isLoading}
                aria-label="承認する"
              >
                <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                承認
              </Button>
            )}
            {testimonial.status !== "rejected" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => handleStatusUpdate("rejected")}
                disabled={isLoading}
                aria-label="非承認にする"
              >
                <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                非承認
              </Button>
            )}

            {/* 削除ダイアログ */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  disabled={isLoading}
                  aria-label="削除する"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>テスティモニアルを削除しますか？</DialogTitle>
                  <DialogDescription>
                    {testimonial.author_name}{" "}
                    さんのテスティモニアルを完全に削除します。この操作は取り消せません。
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                    disabled={isLoading}
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    {isLoading ? "削除中..." : "削除する"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* コンテンツ */}
        <p
          className="text-sm text-foreground mb-3 leading-relaxed"
          data-testid="testimonial-content"
        >
          &ldquo;{testimonial.content}&rdquo;
        </p>

        {/* 投稿者情報 */}
        <div className="flex items-start gap-2.5 mb-3">
          {testimonial.author_avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={testimonial.author_avatar_url}
              alt=""
              className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0">
            {/* 表示名（編集可能）*/}
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-7 text-sm py-0 px-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setIsEditingName(false);
                      setEditedName(testimonial.author_name);
                    }
                  }}
                  autoFocus
                  aria-label="表示名を編集"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={handleSaveName}
                  disabled={isLoading}
                  aria-label="保存"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditedName(testimonial.author_name);
                  }}
                  aria-label="キャンセル"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  className="text-sm font-medium truncate"
                  data-testid="author-name"
                >
                  {testimonial.author_name}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground shrink-0"
                  onClick={() => setIsEditingName(true)}
                  aria-label="表示名を編集"
                >
                  <Edit2 className="w-3 h-3" aria-hidden="true" />
                </Button>
              </div>
            )}

            {(testimonial.author_title || testimonial.author_company) && (
              <p className="text-xs text-muted-foreground truncate">
                {[testimonial.author_title, testimonial.author_company]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            )}

            {/* メールアドレス — 管理画面のみ表示（要件4 AC-9） */}
            {testimonial.author_email && (
              <div className="flex items-center gap-1 mt-0.5">
                <Mail
                  className="w-3 h-3 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <span
                  className="text-xs text-muted-foreground truncate"
                  data-testid="author-email"
                >
                  {testimonial.author_email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* タグ */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {testimonial.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs pr-1 flex items-center gap-0.5"
              data-testid="tag-badge"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-0.5 hover:text-destructive transition-colors rounded"
                aria-label={`タグ「${tag}」を削除`}
                disabled={isLoading}
              >
                <X className="w-2.5 h-2.5" aria-hidden="true" />
              </button>
            </Badge>
          ))}

          {isAddingTag ? (
            <div className="flex items-center gap-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="h-6 text-xs py-0 px-2 w-24"
                placeholder="タグ名"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTag();
                  if (e.key === "Escape") {
                    setIsAddingTag(false);
                    setNewTag("");
                  }
                }}
                autoFocus
                aria-label="新しいタグ名を入力"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleAddTag}
                disabled={isLoading}
                aria-label="タグを追加"
              >
                <Check className="w-3 h-3" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => {
                  setIsAddingTag(false);
                  setNewTag("");
                }}
                aria-label="キャンセル"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => setIsAddingTag(true)}
              disabled={isLoading}
              aria-label="タグを追加"
            >
              <Tag className="w-3 h-3 mr-1" aria-hidden="true" />
              タグ追加
            </Button>
          )}
        </div>

        {/* 投稿日時 */}
        <p className="text-xs text-muted-foreground" data-testid="created-date">
          {formatDate(testimonial.created_at)}
        </p>
      </CardContent>
    </Card>
  );
}
