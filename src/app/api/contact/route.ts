import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { env } from "@/lib/env";
import { contactSchema } from "@/lib/validators/contact";

// Upstash Ratelimit: 5件/時間/IP — 遅延初期化
let _ratelimit: Ratelimit | null = null;
function getRatelimit() {
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: new Redis({
        url: env("UPSTASH_REDIS_REST_URL"),
        token: env("UPSTASH_REDIS_REST_TOKEN"),
      }),
      limiter: Ratelimit.slidingWindow(5, "1 h"),
    });
  }
  return _ratelimit;
}

// Resend — 遅延初期化
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(env("RESEND_API_KEY"));
  }
  return _resend;
}

export async function POST(request: NextRequest) {
  // レートリミット
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  const { success: rateLimitSuccess } = await getRatelimit().limit(
    `contact:${ip}`
  );
  if (!rateLimitSuccess) {
    return NextResponse.json(
      {
        error:
          "送信回数の上限に達しました。しばらく時間をおいて再度お試しください。",
        code: "RATE_LIMITED",
      },
      { status: 429 }
    );
  }

  // バリデーション
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストが無効です", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "入力内容に誤りがあります",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { name, email, message } = parsed.data;

  // DB保存
  const supabase = createServiceRoleClient();
  const { error: insertError } = await supabase
    .from("contacts")
    .insert({ name, email, message });

  if (insertError) {
    console.error("[Contact] DB insert failed:", insertError);
    return NextResponse.json(
      { error: "送信に失敗しました。時間をおいて再度お試しください。", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  // Resendでメール通知
  const contactEmail =
    process.env.CONTACT_EMAIL || "ao.maekawa@gmail.com";

  try {
    await getResend().emails.send({
      from: "Koe <noreply@getkoe.jp>",
      to: contactEmail,
      subject: `[Koe] お問い合わせ: ${name}`,
      text: [
        `名前: ${name}`,
        `メール: ${email}`,
        ``,
        `--- メッセージ ---`,
        message,
        ``,
        `--- 情報 ---`,
        `IP: ${ip}`,
        `日時: ${new Date().toISOString()}`,
      ].join("\n"),
    });
  } catch (emailError) {
    // メール送信失敗してもDB保存は成功しているので200を返す
    console.error("[Contact] Email send failed:", emailError);
  }

  return NextResponse.json(
    { message: "お問い合わせを受け付けました" },
    { status: 201 }
  );
}
