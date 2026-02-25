import { describe, it, expect } from "vitest";
import { createProjectSchema, updateProjectSchema } from "@/lib/validators/project";

describe("createProjectSchema", () => {
  it("有効なデータを受け入れる", () => {
    const result = createProjectSchema.safeParse({
      name: "My Project",
      slug: "my-project",
      brand_color: "#6366f1",
    });
    expect(result.success).toBe(true);
  });

  it("slugなしで名前のみでも有効", () => {
    const result = createProjectSchema.safeParse({
      name: "My Project",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand_color).toBe("#6366f1"); // デフォルト値
    }
  });

  it("名前が空の場合はエラー", () => {
    const result = createProjectSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    }
  });

  it("名前が100文字を超える場合はエラー", () => {
    const result = createProjectSchema.safeParse({
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("無効なスラッグフォーマットを拒否する", () => {
    const invalidSlugs = [
      "-starts-with-hyphen",
      "ends-with-hyphen-",
      "UPPERCASE",
      "has spaces",
      "has_underscore",
      "ab", // 2文字（短すぎる）
    ];

    for (const slug of invalidSlugs) {
      const result = createProjectSchema.safeParse({
        name: "Test",
        slug,
      });
      expect(result.success).toBe(false);
    }
  });

  it("有効なスラッグを受け入れる", () => {
    const validSlugs = [
      "my-project",
      "abc",
      "my-project-2024",
      "project123",
    ];

    for (const slug of validSlugs) {
      const result = createProjectSchema.safeParse({
        name: "Test",
        slug,
      });
      expect(result.success).toBe(true);
    }
  });

  it("無効なブランドカラーを拒否する", () => {
    const invalidColors = ["6366f1", "#fff", "#gggggg", "red"];

    for (const brand_color of invalidColors) {
      const result = createProjectSchema.safeParse({
        name: "Test",
        brand_color,
      });
      expect(result.success).toBe(false);
    }
  });

  it("有効なブランドカラーを受け入れる", () => {
    const result = createProjectSchema.safeParse({
      name: "Test",
      brand_color: "#FF0000",
    });
    expect(result.success).toBe(true);
  });

  it("brand_colorのデフォルト値は '#6366f1'", () => {
    const result = createProjectSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand_color).toBe("#6366f1");
    }
  });
});

describe("updateProjectSchema", () => {
  it("全フィールド省略でも有効（空オブジェクト以外）", () => {
    const result = updateProjectSchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(true);
  });

  it("名前のみ更新が有効", () => {
    const result = updateProjectSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("スラッグのみ更新が有効", () => {
    const result = updateProjectSchema.safeParse({ slug: "new-slug" });
    expect(result.success).toBe(true);
  });

  it("ブランドカラーのみ更新が有効", () => {
    const result = updateProjectSchema.safeParse({ brand_color: "#FF0000" });
    expect(result.success).toBe(true);
  });

  it("logo_url に null を指定できる", () => {
    const result = updateProjectSchema.safeParse({ logo_url: null });
    expect(result.success).toBe(true);
  });

  it("無効なbrand_colorを拒否する", () => {
    const result = updateProjectSchema.safeParse({ brand_color: "#fff" });
    expect(result.success).toBe(false);
  });

  it("無効なスラッグを拒否する", () => {
    const result = updateProjectSchema.safeParse({ slug: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("form_config を更新できる", () => {
    const result = updateProjectSchema.safeParse({
      form_config: {
        fields: [{ key: "author_name", label: "お名前", required: true }],
        thank_you_message: "ありがとう",
      },
    });
    expect(result.success).toBe(true);
  });

  it("空オブジェクトはrefineで拒否される", () => {
    const result = updateProjectSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
