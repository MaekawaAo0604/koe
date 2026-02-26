/**
 * Vercel の環境変数は末尾に改行が付く場合がある。
 * 安全に取得するためのヘルパー。
 */
export function env(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value.trim();
}
