import { describe, it, expect } from "vitest";
import { submitTestimonialSchema } from "../testimonial";

describe("submitTestimonialSchema", () => {
  const validInput = {
    author_name: "山田 太郎",
    rating: 5,
    content: "とても良いサービスでした！",
  };

  it("必須フィールドのみで有効", () => {
    const result = submitTestimonialSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("全フィールドで有効", () => {
    const result = submitTestimonialSchema.safeParse({
      ...validInput,
      author_title: "エンジニア",
      author_company: "株式会社テスト",
      author_email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("author_nameが空の場合はエラー", () => {
    const result = submitTestimonialSchema.safeParse({
      ...validInput,
      author_name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.author_name).toBeDefined();
    }
  });

  it("contentが空の場合はエラー", () => {
    const result = submitTestimonialSchema.safeParse({
      ...validInput,
      content: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.content).toBeDefined();
    }
  });

  it("ratingが0の場合はエラー（1未満）", () => {
    const result = submitTestimonialSchema.safeParse({
      ...validInput,
      rating: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.rating).toBeDefined();
    }
  });

  it("ratingが6の場合はエラー（5超）", () => {
    const result = submitTestimonialSchema.safeParse({
      ...validInput,
      rating: 6,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.rating).toBeDefined();
    }
  });

  it("ratingが1〜5の範囲で有効", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      const result = submitTestimonialSchema.safeParse({ ...validInput, rating });
      expect(result.success).toBe(true);
    }
  });

  it("author_emailが無効な形式の場合はエラー", () => {
    const result = submitTestimonialSchema.safeParse({
      ...validInput,
      author_email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.author_email).toBeDefined();
    }
  });

  it("author_emailが空文字の場合は有効（任意フィールド）", () => {
    const result = submitTestimonialSchema.safeParse({
      ...validInput,
      author_email: "",
    });
    expect(result.success).toBe(true);
  });

  it("author_emailが省略された場合は有効（任意フィールド）", () => {
    const result = submitTestimonialSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});
