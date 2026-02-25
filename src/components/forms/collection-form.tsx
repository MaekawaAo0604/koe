"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/forms/star-rating";
import {
  submitTestimonialSchema,
  type SubmitTestimonialInput,
} from "@/lib/validators/testimonial";
import type { Project } from "@/types/index";
import { CheckCircle } from "lucide-react";

interface CollectionFormProps {
  project: Project;
}

export function CollectionForm({ project }: CollectionFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SubmitTestimonialInput>({
    resolver: zodResolver(submitTestimonialSchema),
    defaultValues: {
      author_name: "",
      author_title: "",
      author_company: "",
      author_email: "",
      rating: 0,
      content: "",
    },
  });

  async function onSubmit(data: SubmitTestimonialInput) {
    setApiError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/testimonials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        if (res.status === 400 && json.code === "TESTIMONIAL_LIMIT_REACHED") {
          setApiError(json.error);
        } else {
          setApiError("送信に失敗しました。しばらくしてから再試行してください。");
        }
        return;
      }

      setSubmitted(true);
    } catch {
      setApiError("送信に失敗しました。しばらくしてから再試行してください。");
    }
  }

  // サンクスメッセージ画面
  if (submitted) {
    const thankYouMessage =
      project.form_config?.thank_you_message ?? "ご協力ありがとうございました！";

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <CheckCircle className="w-16 h-16 text-green-500" aria-hidden="true" />
        <h2 className="text-2xl font-bold">{thankYouMessage}</h2>
        <p className="text-muted-foreground">
          テスティモニアルを送信しました。ありがとうございます。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* 名前（必須） */}
      <div className="space-y-2">
        <Label htmlFor="author_name">
          お名前 <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="author_name"
          {...register("author_name")}
          placeholder="山田 太郎"
          autoComplete="name"
        />
        {errors.author_name && (
          <p className="text-sm text-destructive" role="alert">
            {errors.author_name.message}
          </p>
        )}
      </div>

      {/* ★評価（必須） */}
      <div className="space-y-2">
        <Label>
          評価 <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <StarRating
              value={field.value}
              onChange={field.onChange}
              size="lg"
              error={errors.rating?.message}
            />
          )}
        />
      </div>

      {/* 感想テキスト（必須） */}
      <div className="space-y-2">
        <Label htmlFor="content">
          ご感想 <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <textarea
          id="content"
          {...register("content")}
          placeholder="サービスについてご感想をお聞かせください"
          rows={5}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
        {errors.content && (
          <p className="text-sm text-destructive" role="alert">
            {errors.content.message}
          </p>
        )}
      </div>

      {/* 役職（任意） */}
      <div className="space-y-2">
        <Label htmlFor="author_title">役職（任意）</Label>
        <Input
          id="author_title"
          {...register("author_title")}
          placeholder="マネージャー"
          autoComplete="organization-title"
        />
      </div>

      {/* 会社名（任意） */}
      <div className="space-y-2">
        <Label htmlFor="author_company">会社名（任意）</Label>
        <Input
          id="author_company"
          {...register("author_company")}
          placeholder="株式会社〇〇"
          autoComplete="organization"
        />
      </div>

      {/* メールアドレス（任意） */}
      <div className="space-y-2">
        <Label htmlFor="author_email">メールアドレス（任意）</Label>
        <Input
          id="author_email"
          type="email"
          {...register("author_email")}
          placeholder="you@example.com"
          autoComplete="email"
        />
        {errors.author_email && (
          <p className="text-sm text-destructive" role="alert">
            {errors.author_email.message}
          </p>
        )}
      </div>

      {/* API エラー */}
      {apiError && (
        <p className="text-sm text-destructive" role="alert">
          {apiError}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        style={{ backgroundColor: project.brand_color }}
      >
        {isSubmitting ? "送信中..." : "送信する"}
      </Button>
    </form>
  );
}
