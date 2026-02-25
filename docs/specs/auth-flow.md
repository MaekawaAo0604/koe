# Koe 認証フロー仕様書

## 目次

1. [認証フロー図](#1-認証フロー図)
2. [Supabase Auth 設定](#2-supabase-auth-設定)
3. [Next.js App Router での実装パターン](#3-nextjs-app-router-での実装パターン)
4. [auth.users と public テーブルの連携](#4-authusers-と-public-テーブルの連携)
5. [セキュリティ考慮事項](#5-セキュリティ考慮事項)

---

## 1. 認証フロー図

### 1.1 メール+パスワード サインアップフロー

```
ユーザー                  Next.js (App Router)           Supabase Auth            PostgreSQL
  |                            |                            |                        |
  |  1. フォーム送信            |                            |                        |
  |  (email, password, name)   |                            |                        |
  |--------------------------->|                            |                        |
  |                            |  2. supabase.auth.signUp() |                        |
  |                            |--------------------------->|                        |
  |                            |                            |  3. auth.users INSERT   |
  |                            |                            |----------------------->|
  |                            |                            |                        |
  |                            |                            |  4. trigger:            |
  |                            |                            |  on_auth_user_created   |
  |                            |                            |  -> public.users INSERT |
  |                            |                            |                        |
  |                            |                            |  5. 確認メール送信       |
  |                            |                            |----------------------->| (Supabase SMTP)
  |                            |                            |                        |
  |                            |  6. { user, session: null }|                        |
  |                            |<---------------------------|                        |
  |  7. 「メールを確認してください」  |                            |                        |
  |<---------------------------|                            |                        |
  |                            |                            |                        |
  |  8. 確認メールのリンクをクリック |                            |                        |
  |--------------------------------------------------------------->|                |
  |                            |                            |  9. email_confirmed_at  |
  |                            |                            |     を更新              |
  |                            |                            |                        |
  |  10. /auth/callback にリダイレクト                        |                        |
  |--------------------------->|                            |                        |
  |                            |  11. code を session に交換  |                        |
  |                            |--------------------------->|                        |
  |                            |  12. session 返却           |                        |
  |                            |<---------------------------|                        |
  |  13. /dashboard にリダイレクト |                           |                        |
  |<---------------------------|                            |                        |
```

**signUp 呼び出し時の注意点:**

- `emailRedirectTo` に確認メールからのリダイレクト先を指定する
- メール確認が完了するまで session は null で返る（Supabase のデフォルト設定）
- `data.name` で追加メタデータを渡し、トリガー側で `public.users.name` にセットする

### 1.2 Google OAuth サインアップ/サインインフロー

```
ユーザー                  Next.js (App Router)         Supabase Auth         Google OAuth        PostgreSQL
  |                            |                          |                      |                  |
  |  1. 「Googleで続ける」      |                          |                      |                  |
  |     ボタンクリック           |                          |                      |                  |
  |--------------------------->|                          |                      |                  |
  |                            |  2. supabase.auth         |                      |                  |
  |                            |    .signInWithOAuth({     |                      |                  |
  |                            |      provider: 'google'   |                      |                  |
  |                            |    })                     |                      |                  |
  |                            |------------------------->|                      |                  |
  |                            |                          |  3. Google認証画面    |                  |
  |                            |                          |  へリダイレクト       |                  |
  |<--------------------------------------------------------|                    |                  |
  |                            |                          |                      |                  |
  |  4. Googleアカウント選択    |                          |                      |                  |
  |     + 同意                 |                          |                      |                  |
  |------------------------------------------------------------->|               |                  |
  |                            |                          |                      |                  |
  |                            |                          |  5. authorization     |                  |
  |                            |                          |     code 受信        |                  |
  |                            |                          |<---------------------|                  |
  |                            |                          |                      |                  |
  |                            |                          |  6. access_token取得  |                  |
  |                            |                          |--------------------->|                  |
  |                            |                          |<---------------------|                  |
  |                            |                          |                      |                  |
  |                            |                          |  7. auth.users        |                  |
  |                            |                          |     UPSERT            |                  |
  |                            |                          |--------------------------------------------->|
  |                            |                          |                      |                  |
  |                            |                          |  8. trigger:          |                  |
  |                            |                          |  on_auth_user_created |                  |
  |                            |                          |  (初回のみ)           |                  |
  |                            |                          |                      |                  |
  |  9. /auth/callback?code=xxx にリダイレクト              |                      |                  |
  |--------------------------->|                          |                      |                  |
  |                            |  10. code を session に交換|                      |                  |
  |                            |------------------------->|                      |                  |
  |                            |  11. session 返却         |                      |                  |
  |                            |<-------------------------|                      |                  |
  |  12. /dashboard にリダイレクト|                         |                      |                  |
  |<---------------------------|                          |                      |                  |
```

**Google OAuth の注意点:**

- Google OAuth はメール確認不要（Googleが既に確認済み）
- 同一メールアドレスでメール+パスワードとGoogle OAuthの両方で登録した場合、Supabase は自動的にアカウントをリンクする（`GOTRUE_MAILER_AUTOCONFIRM` が有効の場合。そうでない場合は別アカウントになるので注意）
- `avatar_url` と `full_name` は `raw_user_meta_data` から取得可能

### 1.3 メール+パスワード サインインフロー

```
ユーザー                  Next.js (App Router)           Supabase Auth
  |                            |                            |
  |  1. フォーム送信            |                            |
  |  (email, password)         |                            |
  |--------------------------->|                            |
  |                            |  2. supabase.auth           |
  |                            |    .signInWithPassword()    |
  |                            |--------------------------->|
  |                            |                            |
  |                            |  3a. 成功: { user, session }|
  |                            |<---------------------------|
  |  4a. /dashboard にリダイレクト|                           |
  |<---------------------------|                            |
  |                            |                            |
  |                            |  3b. 失敗: AuthApiError     |
  |                            |<---------------------------|
  |  4b. エラーメッセージ表示    |                            |
  |<---------------------------|                            |
```

**エラーハンドリング:**

| エラーコード | 状況 | ユーザーへの表示 |
|---|---|---|
| `invalid_credentials` | メール/パスワード不一致 | 「メールアドレスまたはパスワードが正しくありません」 |
| `email_not_confirmed` | メール未確認 | 「メールアドレスの確認が完了していません。確認メールをご確認ください」 |
| `user_not_found` | 未登録 | 「メールアドレスまたはパスワードが正しくありません」(セキュリティ上、存在有無は明かさない) |

### 1.4 パスワードリセットフロー

```
ユーザー                  Next.js (App Router)           Supabase Auth
  |                            |                            |
  |  1. パスワードリセット       |                            |
  |     リクエスト (email)      |                            |
  |--------------------------->|                            |
  |                            |  2. supabase.auth           |
  |                            |    .resetPasswordForEmail() |
  |                            |--------------------------->|
  |                            |                            |  3. リセットメール送信
  |                            |  4. { } (常に成功を返す)    |
  |                            |<---------------------------|
  |  5. 「メールを送信しました」  |                            |
  |<---------------------------|                            |
  |                            |                            |
  |  6. メール内リンクをクリック  |                            |
  |     /auth/callback?type=recovery&code=xxx              |
  |--------------------------->|                            |
  |                            |  7. code を session に交換   |
  |                            |--------------------------->|
  |                            |  8. session 返却            |
  |                            |<---------------------------|
  |  9. /auth/reset-password   |                            |
  |     にリダイレクト（新PW入力）|                            |
  |<---------------------------|                            |
  |                            |                            |
  |  10. 新パスワード送信       |                            |
  |--------------------------->|                            |
  |                            |  11. supabase.auth          |
  |                            |    .updateUser({password})  |
  |                            |--------------------------->|
  |                            |  12. 更新完了               |
  |                            |<---------------------------|
  |  13. /dashboard にリダイレクト|                           |
  |<---------------------------|                            |
```

**注意:**

- `resetPasswordForEmail()` は未登録メールでも成功を返す（ユーザー列挙攻撃の防止）
- リセットリンクの有効期限はデフォルト24時間（Supabase Dashboard で変更可能）

### 1.5 セッション管理 / トークンリフレッシュ

```
ブラウザ (Cookie)          Next.js Middleware            Supabase Auth
  |                            |                            |
  |  リクエスト送信             |                            |
  |  Cookie: sb-access-token   |                            |
  |        + sb-refresh-token  |                            |
  |--------------------------->|                            |
  |                            |  1. supabase.auth.getUser() |
  |                            |--------------------------->|
  |                            |                            |
  |                  [access_token が有効な場合]               |
  |                            |  2a. { user } 返却          |
  |                            |<---------------------------|
  |                            |  3a. リクエストを通過         |
  |                            |                            |
  |                  [access_token が期限切れの場合]           |
  |                            |  2b. 401 Unauthorized       |
  |                            |<---------------------------|
  |                            |  3b. refresh_token で更新    |
  |                            |  supabase.auth.refreshSession() |
  |                            |--------------------------->|
  |                            |  4b. 新 access_token +      |
  |                            |      新 refresh_token       |
  |                            |<---------------------------|
  |  5b. Set-Cookie:           |                            |
  |      新トークンを設定       |                            |
  |<---------------------------|                            |
  |                            |                            |
  |                  [refresh_token も期限切れの場合]          |
  |                            |  2c. 401                    |
  |                            |<---------------------------|
  |  3c. /auth/signin に       |                            |
  |      リダイレクト           |                            |
  |<---------------------------|                            |
```

**トークンの寿命（デフォルト）:**

| トークン | 有効期限 | 設定場所 |
|---|---|---|
| access_token (JWT) | 3600秒 (1時間) | Supabase Dashboard > Auth > Settings |
| refresh_token | 無期限 (ただしセッション有効期限に従う) | 同上 |
| セッション全体 | 604800秒 (7日) | `GOTRUE_SESSION_EXPIRY` |

**推奨設定:**

- `access_token`: 3600秒 (デフォルトのまま)
- セッション有効期限: 604800秒 (7日) -- フリーランス向けのため長めでOK
- Inactivity timeout: 86400秒 (24時間) -- 一定期間操作がない場合に自動ログアウト

---

## 2. Supabase Auth 設定

### 2.1 プロバイダー設定

#### Email プロバイダー

Supabase Dashboard > Authentication > Providers > Email で以下を設定:

| 設定項目 | 値 | 説明 |
|---|---|---|
| Enable Email provider | ON | メール+パスワード認証を有効化 |
| Confirm email | ON | メール確認を必須にする |
| Double confirm email changes | ON | メール変更時に新旧両方で確認 |
| Secure email change | ON | メール変更のセキュリティ強化 |
| Minimum password length | 8 | 最小パスワード長 |

#### Google OAuth プロバイダー

**1. Google Cloud Console での設定:**

```
1. Google Cloud Console > APIs & Services > Credentials
2. OAuth 2.0 Client ID を作成
   - Application type: Web application
   - Authorized JavaScript origins:
     - https://koe.example.com (本番)
     - http://localhost:3000 (開発)
   - Authorized redirect URIs:
     - https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
3. Client ID と Client Secret を控える
```

**2. Supabase Dashboard での設定:**

Supabase Dashboard > Authentication > Providers > Google:

| 設定項目 | 値 |
|---|---|
| Enable Google provider | ON |
| Client ID | (Google Cloud Console から取得) |
| Client Secret | (Google Cloud Console から取得) |
| Authorized Client IDs | (空欄でOK) |

### 2.2 リダイレクトURL設定

Supabase Dashboard > Authentication > URL Configuration:

| 設定項目 | 本番 | 開発 |
|---|---|---|
| Site URL | `https://koe.example.com` | `http://localhost:3000` |
| Redirect URLs | `https://koe.example.com/auth/callback` | `http://localhost:3000/auth/callback` |

**追加で許可するリダイレクト URL:**

```
https://koe.example.com/auth/callback
https://koe.example.com/auth/reset-password
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
```

Vercel のプレビューデプロイにも対応する場合:

```
https://*.vercel.app/auth/callback
https://*.vercel.app/auth/reset-password
```

### 2.3 メールテンプレートの日本語化

Supabase Dashboard > Authentication > Email Templates で以下を設定する。

#### 確認メール (Confirm signup)

Subject:
```
【Koe】メールアドレスの確認
```

Body:
```html
<h2>Koe へようこそ</h2>
<p>以下のリンクをクリックしてメールアドレスを確認してください。</p>
<p>
  <a href="{{ .ConfirmationURL }}">メールアドレスを確認する</a>
</p>
<p>このリンクは24時間有効です。</p>
<p>心当たりがない場合は、このメールを無視してください。</p>
<hr>
<p style="color: #666; font-size: 12px;">Koe - テスティモニアル管理サービス</p>
```

#### パスワードリセットメール (Reset password)

Subject:
```
【Koe】パスワードのリセット
```

Body:
```html
<h2>パスワードリセットのリクエスト</h2>
<p>以下のリンクをクリックしてパスワードをリセットしてください。</p>
<p>
  <a href="{{ .ConfirmationURL }}">パスワードをリセットする</a>
</p>
<p>このリンクは24時間有効です。</p>
<p>心当たりがない場合は、このメールを無視してください。パスワードは変更されません。</p>
<hr>
<p style="color: #666; font-size: 12px;">Koe - テスティモニアル管理サービス</p>
```

#### マジックリンクメール (Magic Link) -- 将来の拡張用

Subject:
```
【Koe】ログインリンク
```

Body:
```html
<h2>Koe へのログイン</h2>
<p>以下のリンクをクリックしてログインしてください。</p>
<p>
  <a href="{{ .ConfirmationURL }}">ログインする</a>
</p>
<p>このリンクは5分間有効です。</p>
<hr>
<p style="color: #666; font-size: 12px;">Koe - テスティモニアル管理サービス</p>
```

---

## 3. Next.js App Router での実装パターン

### 3.1 パッケージインストール

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 3.2 環境変数

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
```

### 3.3 Supabase クライアントの作成

`@supabase/ssr` パッケージを使い、用途別に3種類のクライアントを用意する。

#### ブラウザ用クライアント (Client Component)

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### サーバー用クライアント (Server Component / Route Handler / Server Action)

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からの呼び出し時は set が失敗するが、
            // Middleware 側でリフレッシュされるので問題ない
          }
        },
      },
    }
  );
}
```

#### Middleware 用クライアント

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() を呼ぶことでトークンリフレッシュが自動的にトリガーされる
  // 重要: getSession() ではなく getUser() を使うこと。
  // getSession() は JWT を検証せずに返すため、セキュリティ上のリスクがある。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabaseResponse };
}
```

### 3.4 Middleware でのセッション検証と保護されたルートの実装

```typescript
// src/middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 認証が不要な公開パス
const PUBLIC_PATHS = [
  "/",                    // LP
  "/auth/signin",
  "/auth/signup",
  "/auth/callback",
  "/auth/reset-password",
  "/auth/forgot-password",
  "/pricing",
];

// 公開 API パス（認証不要）
const PUBLIC_API_PATHS = [
  "/api/widgets/",        // ウィジェットデータ取得（公開API）
  "/api/webhooks/",       // Stripe Webhook
];

// テスティモニアル投稿フォーム（エンドユーザー向け、認証不要）
const FORM_PATH_PATTERN = /^\/t\/[a-zA-Z0-9-]+$/;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (FORM_PATH_PATTERN.test(pathname)) return true;
  // 静的ファイル
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスはセッション更新のみ行い、リダイレクトしない
  if (isPublicPath(pathname)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // 保護されたパス: セッション検証
  const { user, supabaseResponse } = await updateSession(request);

  if (!user) {
    // 未認証の場合、サインインページにリダイレクト
    // リダイレクト元のパスを保持して、ログイン後に戻れるようにする
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 認証済みユーザーが認証ページにアクセスした場合、ダッシュボードにリダイレクト
  if (
    user &&
    (pathname === "/auth/signin" || pathname === "/auth/signup")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 3.5 Auth Callback ルート

OAuth やメール確認からのコールバックを処理する Route Handler。

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // エラー時はサインインページにリダイレクト
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_error`);
}
```

### 3.6 Server Component での認証状態取得

```typescript
// src/app/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  // getUser() で認証状態を検証（JWT をサーバーサイドで検証する）
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/signin");
  }

  // public.users からプロフィール情報を取得
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1>ダッシュボード</h1>
      <p>ようこそ、{profile?.name ?? user.email}さん</p>
      <p>プラン: {profile?.plan ?? "free"}</p>
    </div>
  );
}
```

### 3.7 Client Component での認証状態取得とサインアウト

```typescript
// src/components/auth/user-menu.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function UserMenu() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 初回ロード時にユーザー取得
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // 認証状態の変更をリアルタイムで監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh(); // Server Component のキャッシュをクリア
  };

  if (!user) return null;

  return (
    <div>
      <span>{user.email}</span>
      <button onClick={handleSignOut}>ログアウト</button>
    </div>
  );
}
```

### 3.8 サインアップ Server Action

```typescript
// src/app/auth/signup/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

interface SignUpFormState {
  error: string | null;
  success: boolean;
}

export async function signUpWithEmail(
  _prevState: SignUpFormState,
  formData: FormData
): Promise<SignUpFormState> {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  // バリデーション
  if (!email || !password || !name) {
    return { error: "すべての項目を入力してください", success: false };
  }

  if (password.length < 8) {
    return {
      error: "パスワードは8文字以上で入力してください",
      success: false,
    };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        name, // raw_user_meta_data に保存される
      },
    },
  });

  if (error) {
    // ユーザーが既に存在する場合もセキュリティ上「メールを送信しました」と返す
    if (error.message.includes("already registered")) {
      return { error: null, success: true };
    }
    return { error: "登録に失敗しました。もう一度お試しください。", success: false };
  }

  return { error: null, success: true };
}

export async function signUpWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    redirect("/auth/signup?error=oauth_error");
  }

  if (data.url) {
    redirect(data.url);
  }
}
```

### 3.9 サインイン Server Action

```typescript
// src/app/auth/signin/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

interface SignInFormState {
  error: string | null;
}

export async function signInWithEmail(
  _prevState: SignInFormState,
  formData: FormData
): Promise<SignInFormState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string | null;

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください" };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  redirect(redirectTo ?? "/dashboard");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect("/auth/signin?error=oauth_error");
  }

  if (data.url) {
    redirect(data.url);
  }
}
```

### 3.10 パスワードリセット Server Action

```typescript
// src/app/auth/forgot-password/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

interface ForgotPasswordFormState {
  error: string | null;
  success: boolean;
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");

  const email = formData.get("email") as string;

  if (!email) {
    return { error: "メールアドレスを入力してください", success: false };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  });

  // セキュリティ上、エラーの有無に関わらず成功メッセージを返す
  if (error) {
    console.error("Password reset error:", error.message);
  }

  return { error: null, success: true };
}
```

```typescript
// src/app/auth/reset-password/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface ResetPasswordFormState {
  error: string | null;
}

export async function updatePassword(
  _prevState: ResetPasswordFormState,
  formData: FormData
): Promise<ResetPasswordFormState> {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "すべての項目を入力してください" };
  }

  if (password !== confirmPassword) {
    return { error: "パスワードが一致しません" };
  }

  if (password.length < 8) {
    return { error: "パスワードは8文字以上で入力してください" };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "パスワードの更新に失敗しました。もう一度お試しください。" };
  }

  redirect("/dashboard");
}
```

### 3.11 App Router ルート構成

```
src/app/
  auth/
    signin/
      page.tsx          -- サインインフォーム
      actions.ts        -- signInWithEmail, signInWithGoogle
    signup/
      page.tsx          -- サインアップフォーム
      actions.ts        -- signUpWithEmail, signUpWithGoogle
    callback/
      route.ts          -- OAuth / メール確認のコールバック処理
    forgot-password/
      page.tsx          -- パスワードリセットリクエストフォーム
      actions.ts        -- requestPasswordReset
    reset-password/
      page.tsx          -- 新パスワード設定フォーム
      actions.ts        -- updatePassword
  dashboard/
    page.tsx            -- 保護されたページ（Middleware で認証チェック済み）
    layout.tsx          -- ダッシュボード共通レイアウト
  (public)/
    page.tsx            -- LP（公開）
    pricing/
      page.tsx          -- 料金ページ（公開）
  t/
    [slug]/
      page.tsx          -- テスティモニアル投稿フォーム（公開）
```

---

## 4. auth.users と public テーブルの連携

### 4.1 public.users テーブル定義

```sql
-- public.users テーブル作成
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS (Row Level Security) を有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のレコードのみ参照・更新可能
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### 4.2 サインアップ時の自動プロフィール作成トリガー

```sql
-- auth.users への INSERT 時に public.users にプロフィールを自動作成する関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',          -- メール登録時に渡した name
      NEW.raw_user_meta_data ->> 'full_name',     -- Google OAuth の full_name
      NEW.raw_user_meta_data ->> 'user_name',     -- フォールバック
      ''                                           -- 最終フォールバック
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',    -- Google OAuth の avatar_url
      NULL
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- auth.users への INSERT をトリガーにする
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**トリガーの重要ポイント:**

1. `SECURITY DEFINER` -- トリガー関数はテーブルオーナーの権限で実行される。RLS を回避して public.users に INSERT するために必要。
2. `SET search_path = ''` -- SQL インジェクション対策として search_path を空にし、すべてのテーブル参照をスキーマ付きで記述する。
3. `COALESCE` -- メール登録と Google OAuth で `raw_user_meta_data` のキー名が異なるため、フォールバックチェーンで名前を取得する。

### 4.3 ID の一致保証

`public.users.id` は `auth.users(id)` への外部キー制約で一致を保証している。

```sql
-- 確認クエリ: auth.users と public.users の ID が一致していることを検証
SELECT
  a.id AS auth_id,
  p.id AS public_id,
  CASE WHEN p.id IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM auth.users a
LEFT JOIN public.users p ON a.id = p.id;
```

**万が一トリガーが失敗してプロフィールが作成されなかった場合の対策:**

```typescript
// src/lib/auth/ensure-profile.ts
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * ログイン後に public.users にプロフィールが存在することを保証する。
 * トリガーが何らかの理由で失敗した場合のフォールバック。
 */
export async function ensureProfile(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  if (!profile) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("users").insert({
        id: user.id,
        email: user.email!,
        name:
          user.user_metadata?.name ??
          user.user_metadata?.full_name ??
          "",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      });
    }
  }
}
```

この関数はダッシュボードのレイアウトで一度呼び出す:

```typescript
// src/app/dashboard/layout.tsx
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // プロフィールの存在を保証（トリガー失敗時のフォールバック）
  await ensureProfile(supabase, user.id);

  return <>{children}</>;
}
```

### 4.4 メール変更時の同期

ユーザーがメールアドレスを変更した場合、`auth.users` の更新を `public.users` に反映するトリガー:

```sql
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    name = COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'full_name',
      (SELECT name FROM public.users WHERE id = NEW.id)
    ),
    avatar_url = COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      (SELECT avatar_url FROM public.users WHERE id = NEW.id)
    ),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_updated();
```

---

## 5. セキュリティ考慮事項

### 5.1 CSRF 対策

**Next.js App Router + Supabase の場合、以下の理由で追加の CSRF 対策は基本的に不要:**

1. **Server Actions** は自動的に CSRF トークンを管理する（Next.js が `__next_action_id` をフォームに埋め込む）
2. **Supabase Auth** のトークンは Cookie に `SameSite=Lax` で保存される
3. **API Route Handlers** を使う場合のみ、追加の対策が必要

API Route Handler を使う場合の対策:

```typescript
// src/lib/auth/validate-request.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * API Route Handler でリクエストの正当性を検証する。
 * - セッションの存在確認
 * - Origin ヘッダーの検証
 */
export async function validateAuthenticatedRequest(request: NextRequest) {
  // Origin ヘッダーの検証（CSRF 対策）
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    "http://localhost:3000",
  ].filter(Boolean);

  if (origin && !allowedOrigins.includes(origin)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  // セッション検証
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, error: null };
}
```

### 5.2 セッション有効期限

Supabase Dashboard > Authentication > Settings で以下を設定:

| 設定項目 | 推奨値 | 説明 |
|---|---|---|
| JWT expiry | 3600 (秒) | access_token の有効期限。短いほどセキュア。 |
| Refresh token rotation | ON | リフレッシュ時に新しい refresh_token を発行し、古いものを無効化する |
| Refresh token reuse interval | 10 (秒) | 同じ refresh_token を再利用できる猶予時間。ネットワーク遅延対策。 |

**Cookie の設定 (Supabase SSR が自動設定):**

| 属性 | 値 | 説明 |
|---|---|---|
| `HttpOnly` | false | JavaScript からアクセス可能（Supabase クライアントがトークンを読む必要があるため） |
| `SameSite` | Lax | CSRF 対策。クロスサイトの POST リクエストでは Cookie が送信されない |
| `Secure` | true (本番) | HTTPS のみで Cookie を送信 |
| `Path` | / | すべてのパスで有効 |

**セッション無効化の実装:**

```typescript
// 強制ログアウト（管理者が全セッションを無効化する場合等）
// Supabase Admin API を使用
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role Key（サーバーサイドのみ）
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 特定ユーザーの全セッションを無効化
async function revokeAllSessions(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.signOut(userId, "global");
  if (error) throw error;
}
```

### 5.3 レートリミット

#### Supabase 側のデフォルトレートリミット

Supabase Auth には以下のデフォルトレートリミットが適用される:

| エンドポイント | 制限 | 備考 |
|---|---|---|
| サインアップ | 1リクエスト/秒/IP | メール確認が有効な場合 |
| サインイン | 30リクエスト/5分/IP | ブルートフォース対策 |
| トークンリフレッシュ | 150リクエスト/5分/IP | -- |
| パスワードリセット | 1リクエスト/60秒/IP | メール送信のレートリミット |
| メール送信全体 | 4通/時間/ユーザー | Supabase のデフォルト。本番では引き上げが必要な場合あり |

#### Supabase Dashboard での設定変更

Auth > Rate Limits で以下をカスタマイズ可能:

```
Rate limit for sending emails: 4 (per hour) -- 必要に応じて引き上げ
Rate limit for sending SMS: 30 (per hour)   -- 不使用
```

#### アプリケーション層での追加レートリミット

Supabase のレートリミットに加え、Vercel Edge Middleware でアプリケーション層のレートリミットを実装する。

```typescript
// src/lib/rate-limit.ts
// 簡易的なインメモリレートリミッタ
// 本番環境では Upstash Redis の使用を推奨

import { LRUCache } from "lru-cache";

type RateLimitOptions = {
  interval: number; // ウィンドウサイズ (ミリ秒)
  uniqueTokenPerInterval: number; // ウィンドウ内の最大ユニークトークン数
};

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (limit: number, token: string): { success: boolean; remaining: number } => {
      const now = Date.now();
      const windowStart = now - options.interval;
      const tokenRecord = tokenCache.get(token) ?? [];

      // ウィンドウ内のリクエストのみカウント
      const validRequests = tokenRecord.filter((ts) => ts > windowStart);
      validRequests.push(now);
      tokenCache.set(token, validRequests);

      const remaining = Math.max(0, limit - validRequests.length);
      const success = validRequests.length <= limit;

      return { success, remaining };
    },
  };
}
```

**テスティモニアル投稿 API でのレートリミット適用 (mvp-spec の要件: 1 IP あたり 10件/時間):**

```typescript
// src/app/api/projects/[id]/testimonials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1時間
  uniqueTokenPerInterval: 500,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // レートリミットチェック
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { success, remaining } = limiter.check(10, `testimonial_${ip}`);

  if (!success) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": remaining.toString(),
          "Retry-After": "3600",
        },
      }
    );
  }

  // ... テスティモニアル投稿処理
}
```

### 5.4 追加のセキュリティ対策

#### パスワード強度要件

Supabase 側では最低文字数のみ設定可能。アプリケーション側で追加の検証を行う:

```typescript
// src/lib/validation/password.ts
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("8文字以上で入力してください");
  }

  // フリーランス向けのサービスであり、過度に厳しい要件は UX を損なうため、
  // 長さのみをサーバーサイドで強制し、強度メーターで推奨する方針とする

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

#### セキュリティヘッダー

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

#### 監査ログ

認証に関わる重要なイベントをログに記録する:

```typescript
// src/lib/auth/audit-log.ts
import { createClient } from "@/lib/supabase/server";

type AuthEvent =
  | "sign_up"
  | "sign_in"
  | "sign_out"
  | "password_reset_request"
  | "password_reset_complete"
  | "email_change"
  | "account_delete";

export async function logAuthEvent(
  userId: string,
  event: AuthEvent,
  metadata?: Record<string, unknown>
) {
  // Supabase の auth.audit_log_entries テーブルは自動的に記録されるが、
  // アプリケーション固有のイベントを追加で記録する場合は
  // public.audit_logs テーブルを別途作成する

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      event: `auth.${event}`,
      userId,
      ...metadata,
    })
  );
}
```

---

## 付録: 認証関連のファイル一覧

```
src/
  lib/
    supabase/
      client.ts              -- ブラウザ用 Supabase クライアント
      server.ts              -- サーバー用 Supabase クライアント
      middleware.ts           -- Middleware 用ヘルパー (updateSession)
    auth/
      ensure-profile.ts      -- プロフィール存在保証ユーティリティ
      audit-log.ts           -- 認証監査ログ
      validate-request.ts    -- API Route の認証バリデーション
    validation/
      password.ts            -- パスワードバリデーション
    rate-limit.ts            -- レートリミッタ
  app/
    auth/
      signin/
        page.tsx
        actions.ts
      signup/
        page.tsx
        actions.ts
      callback/
        route.ts
      forgot-password/
        page.tsx
        actions.ts
      reset-password/
        page.tsx
        actions.ts
  middleware.ts               -- Next.js Middleware (ルート保護)

supabase/
  migrations/
    001_create_users_table.sql      -- public.users テーブル + RLS
    002_create_auth_trigger.sql     -- auth.users -> public.users トリガー
```

---

## 付録: 実装チェックリスト

- [ ] Supabase プロジェクト作成と環境変数設定
- [ ] Google OAuth の Google Cloud Console 設定
- [ ] Supabase Auth プロバイダー設定 (Email + Google)
- [ ] リダイレクト URL 設定
- [ ] メールテンプレートの日本語化
- [ ] `public.users` テーブルと RLS ポリシー作成
- [ ] `handle_new_user` トリガー作成
- [ ] `handle_user_updated` トリガー作成
- [ ] Supabase クライアント 3種作成 (client / server / middleware)
- [ ] Middleware 実装 (セッション更新 + ルート保護)
- [ ] Auth Callback Route Handler 実装
- [ ] サインアップページ + Server Action
- [ ] サインインページ + Server Action
- [ ] パスワードリセットページ + Server Action
- [ ] `ensureProfile` ユーティリティ実装
- [ ] セキュリティヘッダー設定
- [ ] レートリミッター実装
- [ ] E2E テスト (サインアップ -> メール確認 -> サインイン -> サインアウト)
