import { z } from "zod";

const slugRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const createProjectSchema = z.object({
  name: z.string().min(1, "プロジェクト名は必須です").max(100, "プロジェクト名は100文字以内で入力してください"),
  slug: z
    .string()
    .regex(slugRegex, "スラッグは小文字英数字とハイフンのみ（3〜50文字）")
    .optional(),
  brand_color: z
    .string()
    .regex(hexColorRegex, "有効な16進数カラーコードを入力してください（例: #6366f1）")
    .default("#6366f1"),
});

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .min(1, "プロジェクト名は必須です")
      .max(100, "プロジェクト名は100文字以内で入力してください")
      .optional(),
    slug: z
      .string()
      .regex(slugRegex, "スラッグは小文字英数字とハイフンのみ（3〜50文字）")
      .optional(),
    brand_color: z
      .string()
      .regex(hexColorRegex, "有効な16進数カラーコードを入力してください（例: #6366f1）")
      .optional(),
    logo_url: z.string().url("有効なURLを入力してください").nullable().optional(),
    form_config: z
      .object({
        fields: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            required: z.boolean(),
          })
        ),
        thank_you_message: z.string(),
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "更新するフィールドを指定してください",
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
