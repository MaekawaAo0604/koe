import { z } from "zod";

const widgetConfigSchema = z.object({
  theme: z.enum(["light", "dark"]).default("light"),
  show_rating: z.boolean().default(true),
  show_date: z.boolean().default(true),
  show_avatar: z.boolean().default(true),
  max_items: z.number().int().min(1).max(100).default(10),
  columns: z.number().int().min(1).max(4).default(3),
  border_radius: z.number().int().min(0).max(24).default(8),
  shadow: z.boolean().default(true),
  font_family: z.string().max(100).default("inherit"),
});

export const createWidgetSchema = z.object({
  project_id: z.string().uuid("有効なプロジェクトIDを指定してください"),
  type: z.enum(["wall", "carousel", "list"], {
    error: "ウィジェットタイプはwall, carousel, listのいずれかです",
  }),
  config: widgetConfigSchema.optional(),
});

export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;

export const updateWidgetSchema = z
  .object({
    type: z
      .enum(["wall", "carousel", "list"], {
        error: "ウィジェットタイプはwall, carousel, listのいずれかです",
      })
      .optional(),
    config: widgetConfigSchema.partial().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "更新するフィールドが指定されていません",
  });

export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;
