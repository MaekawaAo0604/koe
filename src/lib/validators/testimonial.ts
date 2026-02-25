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
