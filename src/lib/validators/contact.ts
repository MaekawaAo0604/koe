import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100, "名前は100文字以内で入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  message: z.string().min(1, "お問い合わせ内容は必須です").max(5000, "お問い合わせ内容は5000文字以内で入力してください"),
});

export type ContactInput = z.infer<typeof contactSchema>;
