import { describe, it, expect } from "vitest";
import {
  isValidSlug,
  isValidHexColor,
  formatDate,
  calculateUsagePercentage,
} from "@/lib/utils";

describe("isValidSlug", () => {
  it("有効なスラッグを受け入れる", () => {
    expect(isValidSlug("my-project")).toBe(true);
    expect(isValidSlug("abc123")).toBe(true);
    expect(isValidSlug("a1-b2-c3")).toBe(true);
    expect(isValidSlug("test-project-name")).toBe(true);
  });

  it("短すぎるスラッグを拒否する", () => {
    expect(isValidSlug("ab")).toBe(false); // 2文字（最低3文字必要）
    expect(isValidSlug("a")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });

  it("大文字を拒否する", () => {
    expect(isValidSlug("MyProject")).toBe(false);
    expect(isValidSlug("MY-PROJECT")).toBe(false);
  });

  it("先頭・末尾のハイフンを拒否する", () => {
    expect(isValidSlug("-myproject")).toBe(false);
    expect(isValidSlug("myproject-")).toBe(false);
  });

  it("特殊文字を拒否する", () => {
    expect(isValidSlug("my_project")).toBe(false);
    expect(isValidSlug("my.project")).toBe(false);
    expect(isValidSlug("my project")).toBe(false);
  });

  it("50文字を超えるスラッグを拒否する", () => {
    const tooLong = "a" + "-".repeat(49) + "b"; // 51文字
    expect(isValidSlug(tooLong)).toBe(false);
  });
});

describe("isValidHexColor", () => {
  it("有効な16進数カラーコードを受け入れる", () => {
    expect(isValidHexColor("#6366f1")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#FFFFFF")).toBe(true);
    expect(isValidHexColor("#AbCdEf")).toBe(true);
  });

  it("#プレフィックスなしを拒否する", () => {
    expect(isValidHexColor("6366f1")).toBe(false);
    expect(isValidHexColor("000000")).toBe(false);
  });

  it("短縮形を拒否する", () => {
    expect(isValidHexColor("#fff")).toBe(false);
    expect(isValidHexColor("#000")).toBe(false);
  });

  it("無効な文字を拒否する", () => {
    expect(isValidHexColor("#gggggg")).toBe(false);
    expect(isValidHexColor("#12345z")).toBe(false);
  });
});

describe("calculateUsagePercentage", () => {
  it("正しいパーセントを計算する", () => {
    expect(calculateUsagePercentage(0, 10)).toBe(0);
    expect(calculateUsagePercentage(5, 10)).toBe(50);
    expect(calculateUsagePercentage(10, 10)).toBe(100);
    expect(calculateUsagePercentage(3, 10)).toBe(30);
  });

  it("上限を超えた場合は100を返す", () => {
    expect(calculateUsagePercentage(15, 10)).toBe(100);
  });

  it("上限が0の場合は100を返す", () => {
    expect(calculateUsagePercentage(0, 0)).toBe(100);
  });

  it("端数を四捨五入する", () => {
    expect(calculateUsagePercentage(1, 3)).toBe(33); // 33.33... → 33
    expect(calculateUsagePercentage(2, 3)).toBe(67); // 66.66... → 67
  });
});

describe("formatDate", () => {
  it("日本語形式で日付をフォーマットする", () => {
    const result = formatDate("2024-01-15T00:00:00.000Z");
    expect(result).toContain("2024");
    expect(result).toContain("1");
    expect(result).toContain("15");
  });
});
