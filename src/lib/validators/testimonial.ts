import { z } from "zod";

export const submitTestimonialSchema = z.object({
  author_name: z.string().min(1, "名前は必須です").max(100),
  author_title: z.string().max(100).optional().or(z.literal("")),
  author_company: z.string().max(100).optional().or(z.literal("")),
  author_email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .optional()
    .or(z.literal("")),
  rating: z
    .number()
    .int()
    .min(1, "1以上で評価してください")
    .max(5, "5以下で評価してください"),
  content: z.string().min(1, "感想は必須です").max(2000),
});

export type SubmitTestimonialInput = z.infer<typeof submitTestimonialSchema>;

// PATCH /api/testimonials/:id 用スキーマ
// status, tags, author_name（表示名）の部分更新に対応
export const updateTestimonialSchema = z
  .object({
    status: z.enum(["approved", "rejected"]).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    author_name: z.string().min(1, "表示名は1文字以上必要です").max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "更新するフィールドが指定されていません",
  });

export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;
