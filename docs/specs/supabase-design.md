# Koe - Supabase設計仕様書

## 概要

本ドキュメントはKoe（テスティモニアル収集・管理・表示SaaS）のSupabase設計仕様を定義する。
対象はデータベーススキーマ、RLS（Row Level Security）ポリシー、Auth連携、パフォーマンス考慮、
およびFreeプランのテスティモニアル件数制限の実装方法である。

すべてのSQLはSupabase SQL Editorでそのまま実行可能な形式で記述している。

---

## 1. テーブル定義（SQL）

### 1.1 前提: カスタム型の定義

```sql
-- プラン種別
CREATE TYPE public.plan_type AS ENUM ('free', 'pro');

-- テスティモニアルの承認状態
CREATE TYPE public.testimonial_status AS ENUM ('pending', 'approved', 'rejected');

-- ウィジェットの表示タイプ
CREATE TYPE public.widget_type AS ENUM ('wall', 'carousel', 'list');

-- サブスクリプションの状態
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due');
```

### 1.2 users テーブル

Supabase Auth の `auth.users` と1:1で対応するプロファイルテーブル。
`auth.users` に格納されない業務固有の情報を保持する。

```sql
CREATE TABLE public.users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  name          text NOT NULL DEFAULT '',
  avatar_url    text,
  plan          public.plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id text UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- サインイン時にplanでフィルタするケースはないため、indexは不要
-- stripe_customer_idはWebhookでの検索に使うためUNIQUE制約で自動的にインデックスが作られる

COMMENT ON TABLE public.users IS 'ユーザープロファイル。auth.usersと1:1対応。';
COMMENT ON COLUMN public.users.plan IS '現在の契約プラン。subscriptionsテーブルと整合性を保つこと。';
```

### 1.3 projects テーブル

```sql
CREATE TABLE public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  logo_url      text,
  brand_color   text NOT NULL DEFAULT '#6366f1',
  form_config   jsonb NOT NULL DEFAULT '{
    "fields": [
      {"key": "author_name", "label": "お名前", "required": true},
      {"key": "author_title", "label": "役職", "required": false},
      {"key": "author_company", "label": "会社名", "required": false},
      {"key": "author_email", "label": "メールアドレス", "required": false},
      {"key": "rating", "label": "評価", "required": true},
      {"key": "content", "label": "ご感想", "required": true}
    ],
    "thank_you_message": "ご協力ありがとうございました！"
  }'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT projects_brand_color_hex CHECK (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  CONSTRAINT projects_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

-- user_idでのフィルタは頻出（ダッシュボードのプロジェクト一覧）
CREATE INDEX idx_projects_user_id ON public.projects(user_id);

-- slugはフォームURL（/f/:slug）で使用。UNIQUEなので自動インデックス済み

COMMENT ON TABLE public.projects IS 'テスティモニアル収集プロジェクト。';
COMMENT ON COLUMN public.projects.slug IS 'フォームURL用のスラッグ。例: /f/my-project';
COMMENT ON COLUMN public.projects.form_config IS '収集フォームの質問項目設定。JSON Schema準拠。';
```

### 1.4 testimonials テーブル

```sql
CREATE TABLE public.testimonials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status            public.testimonial_status NOT NULL DEFAULT 'pending',
  author_name       text NOT NULL,
  author_title      text,
  author_company    text,
  author_email      text,
  author_avatar_url text,
  rating            integer NOT NULL,
  content           text NOT NULL,
  tags              text[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT testimonials_rating_range CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT testimonials_content_not_empty CHECK (char_length(content) > 0),
  CONSTRAINT testimonials_author_name_not_empty CHECK (char_length(author_name) > 0)
);

-- project_id + statusの複合インデックス
-- ウィジェット表示時に「特定プロジェクトのapproved」を取得するクエリが最頻出
CREATE INDEX idx_testimonials_project_status ON public.testimonials(project_id, status);

-- 管理画面でのcreated_atソートに対応
CREATE INDEX idx_testimonials_project_created ON public.testimonials(project_id, created_at DESC);

COMMENT ON TABLE public.testimonials IS 'お客様の声（テスティモニアル）。フォームから公開投稿される。';
COMMENT ON COLUMN public.testimonials.status IS '承認状態。フォーム投稿時はpending、管理者が承認するとapprovedになる。';
```

### 1.5 widgets テーブル

```sql
CREATE TABLE public.widgets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type          public.widget_type NOT NULL DEFAULT 'wall',
  config        jsonb NOT NULL DEFAULT '{
    "theme": "light",
    "show_rating": true,
    "show_date": false,
    "show_avatar": true,
    "max_items": 20,
    "columns": 3,
    "border_radius": 12,
    "shadow": true,
    "font_family": "inherit"
  }'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- project_idでのフィルタ（管理画面でのウィジェット一覧）
CREATE INDEX idx_widgets_project_id ON public.widgets(project_id);

COMMENT ON TABLE public.widgets IS 'ウィジェット設定。1プロジェクトに複数ウィジェットを作成可能。';
COMMENT ON COLUMN public.widgets.config IS 'ウィジェットのデザイン設定。テーマ、色、角丸など。';
```

### 1.6 subscriptions テーブル

```sql
CREATE TABLE public.subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id  text NOT NULL UNIQUE,
  plan                    public.plan_type NOT NULL DEFAULT 'pro',
  status                  public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end      timestamptz NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_plan_not_free CHECK (plan != 'free')
);

-- user_idでのフィルタ（ユーザーのサブスクリプション確認）
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Stripe Webhookでsubscription_idを使って検索する。UNIQUEで自動インデックス済み

COMMENT ON TABLE public.subscriptions IS 'Stripeサブスクリプション情報。Webhookで更新される。';
COMMENT ON COLUMN public.subscriptions.status IS 'Stripe側のサブスクリプション状態と同期。';
```

### 1.7 updated_at 自動更新トリガー

```sql
-- 汎用的なupdated_at自動更新関数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.widgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## 2. RLS（Row Level Security）ポリシー

### 2.1 RLSの有効化

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
```

### 2.2 ヘルパー関数

RLSポリシー内で繰り返し使用するロジックを関数化する。
サブクエリの重複を避け、メンテナンス性を向上させる。

```sql
-- 現在のログインユーザーのIDを取得
-- auth.uid() のラッパー（可読性のため）
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 指定されたproject_idのオーナー（user_id）を返す
CREATE OR REPLACE FUNCTION public.project_owner_id(p_project_id uuid)
RETURNS uuid AS $$
  SELECT user_id FROM public.projects WHERE id = p_project_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 現在のユーザーが指定プロジェクトのオーナーかどうか判定
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 2.3 users テーブルのRLSポリシー

```sql
-- SELECT: 自分のデータのみ参照可能
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- UPDATE: 自分のデータのみ更新可能
-- plan, stripe_customer_id はサーバーサイド（service_role）でのみ更新するため
-- ユーザーが直接変更できるカラムを制限する
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: Auth トリガーで作成されるため、通常のクライアントからは不要
-- ただしトリガーはSECURITY DEFINER で実行されるためRLSをバイパスする
-- 万が一に備えてポリシーを定義
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- DELETE: ユーザーの直接削除は禁止（アカウント削除はサーバーサイドで処理）
-- DELETEポリシーを作成しないことで拒否される
```

### 2.4 projects テーブルのRLSポリシー

```sql
-- SELECT: 自分のプロジェクトのみ参照可能
CREATE POLICY "projects_select_own"
  ON public.projects
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: 認証済みユーザーが自分のuser_idで作成
CREATE POLICY "projects_insert_own"
  ON public.projects
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: 自分のプロジェクトのみ更新可能
CREATE POLICY "projects_update_own"
  ON public.projects
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: 自分のプロジェクトのみ削除可能
CREATE POLICY "projects_delete_own"
  ON public.projects
  FOR DELETE
  USING (user_id = auth.uid());
```

### 2.5 testimonials テーブルのRLSポリシー

testimonials は最も複雑なRLS設計が必要なテーブルである。

- **INSERT（公開）**: 認証不要。エンドユーザーがフォームからテスティモニアルを投稿する。
- **SELECT（管理者）**: プロジェクトオーナーのみ全件参照可能。
- **SELECT（公開）**: ウィジェット表示用に、approvedのテスティモニアルは誰でも参照可能。
- **UPDATE / DELETE**: プロジェクトオーナーのみ。

```sql
-- INSERT: 認証不要（anon/publicからの投稿を許可）
-- フォームからの投稿に対応する
-- statusはpendingのみ許可（承認済みでの投稿を防ぐ）
CREATE POLICY "testimonials_insert_public"
  ON public.testimonials
  FOR INSERT
  WITH CHECK (
    status = 'pending'
  );

-- SELECT: プロジェクトオーナーは全件参照可能
CREATE POLICY "testimonials_select_owner"
  ON public.testimonials
  FOR SELECT
  USING (
    public.is_project_owner(project_id)
  );

-- SELECT: 承認済みテスティモニアルは誰でも参照可能（ウィジェット表示用）
-- anonキーでのアクセスを想定
CREATE POLICY "testimonials_select_approved_public"
  ON public.testimonials
  FOR SELECT
  USING (
    status = 'approved'
  );

-- UPDATE: プロジェクトオーナーのみ
CREATE POLICY "testimonials_update_owner"
  ON public.testimonials
  FOR UPDATE
  USING (
    public.is_project_owner(project_id)
  )
  WITH CHECK (
    public.is_project_owner(project_id)
  );

-- DELETE: プロジェクトオーナーのみ
CREATE POLICY "testimonials_delete_owner"
  ON public.testimonials
  FOR DELETE
  USING (
    public.is_project_owner(project_id)
  );
```

### 2.6 widgets テーブルのRLSポリシー

```sql
-- SELECT（公開）: ウィジェットの設定はwidget.jsから取得するため、誰でも参照可能
-- widget_idを知っている人だけがアクセスできる（UUID推測不可能性に依存）
CREATE POLICY "widgets_select_public"
  ON public.widgets
  FOR SELECT
  USING (true);

-- INSERT: プロジェクトオーナーのみ
CREATE POLICY "widgets_insert_owner"
  ON public.widgets
  FOR INSERT
  WITH CHECK (
    public.is_project_owner(project_id)
  );

-- UPDATE: プロジェクトオーナーのみ
CREATE POLICY "widgets_update_owner"
  ON public.widgets
  FOR UPDATE
  USING (
    public.is_project_owner(project_id)
  )
  WITH CHECK (
    public.is_project_owner(project_id)
  );

-- DELETE: プロジェクトオーナーのみ
CREATE POLICY "widgets_delete_owner"
  ON public.widgets
  FOR DELETE
  USING (
    public.is_project_owner(project_id)
  );
```

### 2.7 subscriptions テーブルのRLSポリシー

```sql
-- SELECT: 自分のサブスクリプションのみ参照可能
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: Stripe Webhookからservice_roleで操作するため、
-- クライアントからの直接操作は全て禁止
-- ポリシーを作成しないことでINSERT/UPDATE/DELETEは拒否される
```

---

## 3. Supabase Auth連携

### 3.1 新規ユーザー登録時のプロファイル自動作成

`auth.users` にレコードが作成されたら、`public.users` にプロファイルを自動作成する。
これによりクライアント側で別途INSERT文を発行する必要がなくなる。

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- auth.users への INSERT をトリガー
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**重要ポイント**:

- `SECURITY DEFINER` を指定することで、RLSをバイパスして `public.users` にINSERTできる。
- `SET search_path = public` はセキュリティベストプラクティス。search_path injection攻撃を防ぐ。
- `raw_user_meta_data` はGoogle OAuthログイン時にプロバイダーから提供される情報を含む。
  メール+パスワードの場合は空になるため、`split_part(email, '@', 1)` をフォールバックに使う。

### 3.2 ユーザー削除時の処理

`auth.users` が削除された場合、`ON DELETE CASCADE` により `public.users` も自動削除される。
さらに外部キーのカスケードにより、projects -> testimonials -> widgets も連鎖削除される。

削除順序:
```
auth.users 削除
  -> public.users 削除 (CASCADE)
    -> public.projects 削除 (CASCADE)
      -> public.testimonials 削除 (CASCADE)
      -> public.widgets 削除 (CASCADE)
    -> public.subscriptions 削除 (CASCADE)
```

### 3.3 Auth設定（Supabaseダッシュボード）

以下はSupabaseダッシュボードのAuthentication設定で手動設定する項目:

| 設定項目 | 値 | 理由 |
|----------|-----|------|
| Enable email confirmations | ON | スパムアカウント防止 |
| Enable Google OAuth | ON | ソーシャルログイン対応 |
| Minimum password length | 8 | セキュリティ基準 |
| Site URL | `https://koe.example.com` | リダイレクト先 |
| Redirect URLs | `https://koe.example.com/**` | ワイルドカードで各画面対応 |

### 3.4 クライアント側のAuth使用例

```typescript
// サインアップ（メール+パスワード）
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      full_name: 'ユーザー名',
    },
  },
});
// -> トリガーによりpublic.usersに自動でプロファイルが作成される

// Google OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});

// 現在のユーザープロファイル取得
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .single();
// -> RLSにより自分のデータのみ返る
```

---

## 4. 注意点 - Supabase特有のハマりポイントとパフォーマンス考慮

### 4.1 RLS関連

#### (a) `service_role` キーの使い分け

| キー | 用途 | RLS |
|------|------|-----|
| `anon` キー | クライアント（ブラウザ）からのアクセス | 適用される |
| `service_role` キー | サーバーサイド（API Routes, Webhook）からのアクセス | バイパスされる |

**絶対に `service_role` キーをクライアントに露出させないこと。** フロントエンドのコードやブラウザの環境変数に含めてはならない。

```typescript
// サーバーサイドでのSupabaseクライアント作成
import { createClient } from '@supabase/supabase-js';

// API Route / Webhook 用（RLSバイパス）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 秘密鍵。NEXT_PUBLIC_ を付けない
);
```

#### (b) RLSポリシーのパフォーマンス

RLSポリシーは各行に対して評価されるため、サブクエリが含まれるポリシーはパフォーマンスに影響する。

`is_project_owner()` 関数は内部で `projects` テーブルを参照する。testimonials テーブルの大量データに対してこの関数が行ごとに呼ばれるため、`projects.id` のインデックスが不可欠。PRIMARY KEYにより自動的にインデックスが存在するため問題ないが、認識しておくこと。

#### (c) anonアクセスでのINSERT

テスティモニアルのフォーム投稿は認証不要（anonキーでのアクセス）で行われる。
Supabaseでは `anon` ロールに対してもRLSポリシーが適用される。
`testimonials_insert_public` ポリシーの `WITH CHECK` で `status = 'pending'` を強制しているため、
悪意のあるユーザーが `status: 'approved'` で投稿しても弾かれる。

#### (d) SELECTポリシーの重複

testimonials テーブルには2つのSELECTポリシーがある:
- `testimonials_select_owner`: オーナーは全件参照
- `testimonials_select_approved_public`: 誰でもapprovedを参照

SupabaseのRLSでは複数のポリシーは **OR** で結合される。つまり、どちらかのポリシーを満たせばアクセスできる。
この動作は意図通りである。

### 4.2 パフォーマンス考慮

#### (a) ウィジェットAPIのクエリ最適化

ウィジェット表示は最も頻繁に呼ばれるAPIである。以下のクエリが最適に実行されるようインデックスを設計済み。

```sql
-- ウィジェット表示時の典型的なクエリ
SELECT
  t.id,
  t.author_name,
  t.author_title,
  t.author_company,
  t.author_avatar_url,
  t.rating,
  t.content,
  t.created_at
FROM public.testimonials t
WHERE t.project_id = $1
  AND t.status = 'approved'
ORDER BY t.created_at DESC
LIMIT 20;

-- idx_testimonials_project_status (project_id, status) が使われる
```

#### (b) CDNキャッシュとの連携

ウィジェットデータはVercel Edge Cacheを活用する。Supabase側では以下を考慮:

- ウィジェットAPIはSupabaseクライアントを使わず、直接PostgreSQL接続（connection pooling経由）で実行してもよい
- ただしMVPではSupabaseクライアント + Vercel Edge Cacheの組み合わせで十分

```typescript
// Next.js API Route でのキャッシュ制御例
export async function GET(request: Request) {
  const data = await supabase
    .from('testimonials')
    .select('id, author_name, author_title, author_company, author_avatar_url, rating, content, created_at')
    .eq('project_id', projectId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}
```

#### (c) Connection Pooling

Supabaseはデフォルトでpgbouncerによるconnection poolingを提供している。

- **Transaction mode（デフォルト、ポート6543）**: サーバーレス環境（Vercel Functions）ではこちらを使用
- **Session mode（ポート5432）**: リアルタイム機能やprepared statementsが必要な場合

```
# .env.local
# Transaction mode（APIアクセス用）
DATABASE_URL=postgresql://postgres:[password]@[host]:6543/postgres?pgbouncer=true

# Direct connection（マイグレーション用）
DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

#### (d) N+1クエリの回避

Supabaseクライアントの `select` でリレーションを含めることで、1回のクエリで関連データを取得できる。

```typescript
// ダッシュボード: プロジェクト一覧 + 各プロジェクトのテスティモニアル数
const { data: projects } = await supabase
  .from('projects')
  .select(`
    *,
    testimonials(count)
  `)
  .eq('user_id', userId);
```

### 4.3 セキュリティ考慮

#### (a) フォーム投稿のレートリミット

RLSだけではレートリミットを実現できない。以下の方法で対処する:

**方法: Next.js API Route + Upstash Redis でのレートリミット**

```typescript
// /api/projects/[id]/testimonials (POST)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 1時間に10件
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return Response.json(
      { error: '投稿回数の上限に達しました。しばらく時間をおいて再度お試しください。' },
      { status: 429 }
    );
  }

  // ... テスティモニアル投稿処理
}
```

#### (b) SQL Injection対策

Supabaseクライアントはパラメータ化クエリを内部的に使用するため、基本的にSQL Injectionのリスクは低い。
ただし、`rpc()` でカスタム関数を呼ぶ場合やRaw SQLを使う場合は注意が必要。

#### (c) author_emailの保護

テスティモニアルの `author_email` はプロジェクトオーナーのみが参照可能であるべき。
ウィジェット用の公開SELECTポリシーでは全カラムが見えてしまうため、
**ウィジェットAPIでは `author_email` を含めないようにSELECTカラムを明示する。**

これはRLSのカラムレベル制御ではなくアプリケーション層で対応する。
SupabaseのRLSは行レベルの制御であり、カラムレベルの制御は提供しないため。

```typescript
// ウィジェットAPI: author_emailを含めない
const { data } = await supabase
  .from('testimonials')
  .select('id, author_name, author_title, author_company, author_avatar_url, rating, content, created_at')
  .eq('project_id', projectId)
  .eq('status', 'approved');
```

**追加の保護策として**、公開SELECTはビューを経由させることも検討できる:

```sql
-- 公開用ビュー（author_emailを除外）
CREATE VIEW public.testimonials_public AS
SELECT
  id, project_id, status, author_name, author_title,
  author_company, author_avatar_url, rating, content, tags, created_at
FROM public.testimonials
WHERE status = 'approved';
```

### 4.4 よくあるハマりポイント

| 問題 | 原因 | 対策 |
|------|------|------|
| `new row violates row-level security policy` で INSERT が失敗する | RLSポリシーの `WITH CHECK` 条件を満たしていない | ポリシーの条件を確認。特に `user_id = auth.uid()` が正しいか |
| トリガー関数内で `public.users` に INSERT できない | トリガー関数に `SECURITY DEFINER` がない | `SECURITY DEFINER SET search_path = public` を追加 |
| anon キーでのテスティモニアル投稿が失敗する | anon ロールに対するINSERTポリシーがない | `testimonials_insert_public` ポリシーを確認 |
| サーバーサイドでRLSが効いてしまう | `service_role` キーではなく `anon` キーを使っている | 環境変数を確認。API Routeでは `SUPABASE_SERVICE_ROLE_KEY` を使用 |
| `count` が返らない / 0 になる | RLSで参照権限のない行はカウントされない | 正しいユーザーで認証されているか確認 |
| realtime が動かない | テーブルの replication 設定が OFF | Supabase ダッシュボード > Database > Replication で該当テーブルを有効化 |
| マイグレーションが pgbouncer 経由で失敗する | Transaction mode では DDL が制限される場合がある | `DIRECT_URL` （ポート5432直接接続）を使用 |

---

## 5. テスティモニアル件数制限の実装方法（Free: 10件）

Freeプランではプロジェクトあたりのテスティモニアル数を10件に制限する。
この制限は **DBレベルのトリガー** で確実に強制する。

### 5.1 設計方針

制限の実装方法として以下の3つを比較した:

| 方法 | メリット | デメリット |
|------|----------|------------|
| (A) アプリケーション層のみ | 実装が簡単 | バイパス可能（Supabase直アクセス等） |
| (B) RLSポリシーのWITH CHECK | DB層で強制できる | RLSのサブクエリが複雑化。パフォーマンス懸念 |
| (C) **BEFORE INSERT トリガー** | DB層で確実に強制。ロジックが明確 | トリガー関数の管理が必要 |

**方法 (C) を採用する。** 理由:

1. DBレベルで強制されるため、どの経路（クライアント、API、Supabaseダッシュボード）からの投稿でも制限が適用される
2. RLSポリシーに制限ロジックを混ぜるとポリシーが複雑化し、デバッグが困難になる
3. トリガー関数は明確なエラーメッセージを返せる

### 5.2 実装SQL

```sql
-- テスティモニアル件数制限チェック関数
CREATE OR REPLACE FUNCTION public.check_testimonial_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_plan public.plan_type;
  v_current_count integer;
  v_limit integer;
BEGIN
  -- 投稿先プロジェクトのオーナーを特定
  SELECT p.user_id INTO v_user_id
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  -- プロジェクトが存在しない場合（通常はFK制約で弾かれるが念のため）
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Project not found: %', NEW.project_id;
  END IF;

  -- オーナーのプランを取得
  SELECT u.plan INTO v_plan
  FROM public.users u
  WHERE u.id = v_user_id;

  -- Proプランは無制限
  IF v_plan = 'pro' THEN
    RETURN NEW;
  END IF;

  -- Freeプランの制限値
  v_limit := 10;

  -- 現在の件数を取得（対象プロジェクトのテスティモニアル数）
  -- statusに関係なく全件をカウント（rejected含む）
  SELECT COUNT(*) INTO v_current_count
  FROM public.testimonials t
  WHERE t.project_id = NEW.project_id;

  -- 制限チェック
  IF v_current_count >= v_limit THEN
    RAISE EXCEPTION 'TESTIMONIAL_LIMIT_REACHED: Free plan allows up to % testimonials per project. Please upgrade to Pro for unlimited testimonials.', v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- BEFORE INSERT トリガーとして設定
CREATE TRIGGER check_testimonial_limit_before_insert
  BEFORE INSERT ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.check_testimonial_limit();
```

### 5.3 件数制限の仕様詳細

| 項目 | 仕様 |
|------|------|
| 制限対象 | **プロジェクト単位** でカウント |
| カウント対象 | 全status（pending, approved, rejected）を含む |
| Freeプランの上限 | 10件/プロジェクト |
| Proプランの上限 | 無制限 |
| 制限タイミング | INSERT時（BEFORE INSERT トリガー） |
| エラーコード | `P0001`（raise_exception） |
| Proからダウングレード時 | 既存の11件以上のテスティモニアルは残る。新規投稿は不可 |

### 5.4 クライアント側でのエラーハンドリング

```typescript
// テスティモニアル投稿時のエラーハンドリング
const { data, error } = await supabase
  .from('testimonials')
  .insert({
    project_id: projectId,
    author_name: formData.name,
    content: formData.content,
    rating: formData.rating,
    // statusはDEFAULT 'pending' なので指定不要
  });

if (error) {
  if (error.message.includes('TESTIMONIAL_LIMIT_REACHED')) {
    // Freeプランの件数上限に到達
    // ユーザーにアップグレードを促すUIを表示
    showUpgradePrompt();
  } else {
    // その他のエラー
    showGenericError(error.message);
  }
}
```

### 5.5 管理画面での件数表示

プロジェクトオーナーが現在の利用状況を確認できるようにする。

```typescript
// 現在の件数と上限を取得
async function getTestimonialUsage(projectId: string, userPlan: string) {
  const { count } = await supabase
    .from('testimonials')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  return {
    current: count ?? 0,
    limit: userPlan === 'pro' ? Infinity : 10,
    isAtLimit: userPlan === 'free' && (count ?? 0) >= 10,
  };
}
```

### 5.6 将来の拡張: ユーザー全体での件数制限

現在はプロジェクト単位の制限だが、将来的にユーザーが所有する全プロジェクトの合計で制限をかける場合:

```sql
-- 参考: ユーザー全体でのカウント（将来用）
-- 現段階では実装不要。プロジェクト単位の制限で十分。
SELECT COUNT(*)
FROM public.testimonials t
INNER JOIN public.projects p ON t.project_id = p.id
WHERE p.user_id = v_user_id;
```

---

## 付録A: 全SQLの実行順序

以下の順序でSupabase SQL Editorに貼り付けて実行する。

```sql
-- ============================================================
-- Step 1: カスタム型
-- ============================================================
CREATE TYPE public.plan_type AS ENUM ('free', 'pro');
CREATE TYPE public.testimonial_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.widget_type AS ENUM ('wall', 'carousel', 'list');
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due');

-- ============================================================
-- Step 2: テーブル作成
-- ============================================================

-- users
CREATE TABLE public.users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  name          text NOT NULL DEFAULT '',
  avatar_url    text,
  plan          public.plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id text UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- projects
CREATE TABLE public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  logo_url      text,
  brand_color   text NOT NULL DEFAULT '#6366f1',
  form_config   jsonb NOT NULL DEFAULT '{
    "fields": [
      {"key": "author_name", "label": "お名前", "required": true},
      {"key": "author_title", "label": "役職", "required": false},
      {"key": "author_company", "label": "会社名", "required": false},
      {"key": "author_email", "label": "メールアドレス", "required": false},
      {"key": "rating", "label": "評価", "required": true},
      {"key": "content", "label": "ご感想", "required": true}
    ],
    "thank_you_message": "ご協力ありがとうございました！"
  }'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_brand_color_hex CHECK (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  CONSTRAINT projects_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);

-- testimonials
CREATE TABLE public.testimonials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status            public.testimonial_status NOT NULL DEFAULT 'pending',
  author_name       text NOT NULL,
  author_title      text,
  author_company    text,
  author_email      text,
  author_avatar_url text,
  rating            integer NOT NULL,
  content           text NOT NULL,
  tags              text[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT testimonials_rating_range CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT testimonials_content_not_empty CHECK (char_length(content) > 0),
  CONSTRAINT testimonials_author_name_not_empty CHECK (char_length(author_name) > 0)
);

CREATE INDEX idx_testimonials_project_status ON public.testimonials(project_id, status);
CREATE INDEX idx_testimonials_project_created ON public.testimonials(project_id, created_at DESC);

-- widgets
CREATE TABLE public.widgets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type          public.widget_type NOT NULL DEFAULT 'wall',
  config        jsonb NOT NULL DEFAULT '{
    "theme": "light",
    "show_rating": true,
    "show_date": false,
    "show_avatar": true,
    "max_items": 20,
    "columns": 3,
    "border_radius": 12,
    "shadow": true,
    "font_family": "inherit"
  }'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_widgets_project_id ON public.widgets(project_id);

-- subscriptions
CREATE TABLE public.subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id  text NOT NULL UNIQUE,
  plan                    public.plan_type NOT NULL DEFAULT 'pro',
  status                  public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end      timestamptz NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_plan_not_free CHECK (plan != 'free')
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

-- ============================================================
-- Step 3: 共通関数・トリガー
-- ============================================================

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.widgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auth連携: 新規ユーザー作成時のプロファイル自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- テスティモニアル件数制限チェック
CREATE OR REPLACE FUNCTION public.check_testimonial_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_plan public.plan_type;
  v_current_count integer;
  v_limit integer;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Project not found: %', NEW.project_id;
  END IF;

  SELECT u.plan INTO v_plan
  FROM public.users u
  WHERE u.id = v_user_id;

  IF v_plan = 'pro' THEN
    RETURN NEW;
  END IF;

  v_limit := 10;

  SELECT COUNT(*) INTO v_current_count
  FROM public.testimonials t
  WHERE t.project_id = NEW.project_id;

  IF v_current_count >= v_limit THEN
    RAISE EXCEPTION 'TESTIMONIAL_LIMIT_REACHED: Free plan allows up to % testimonials per project. Please upgrade to Pro for unlimited testimonials.', v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_testimonial_limit_before_insert
  BEFORE INSERT ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.check_testimonial_limit();

-- ============================================================
-- Step 4: RLSヘルパー関数
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.project_owner_id(p_project_id uuid)
RETURNS uuid AS $$
  SELECT user_id FROM public.projects WHERE id = p_project_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Step 5: RLS有効化
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 6: RLSポリシー
-- ============================================================

-- users
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- projects
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE USING (user_id = auth.uid());

-- testimonials
CREATE POLICY "testimonials_insert_public" ON public.testimonials
  FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "testimonials_select_owner" ON public.testimonials
  FOR SELECT USING (public.is_project_owner(project_id));
CREATE POLICY "testimonials_select_approved_public" ON public.testimonials
  FOR SELECT USING (status = 'approved');
CREATE POLICY "testimonials_update_owner" ON public.testimonials
  FOR UPDATE USING (public.is_project_owner(project_id))
  WITH CHECK (public.is_project_owner(project_id));
CREATE POLICY "testimonials_delete_owner" ON public.testimonials
  FOR DELETE USING (public.is_project_owner(project_id));

-- widgets
CREATE POLICY "widgets_select_public" ON public.widgets
  FOR SELECT USING (true);
CREATE POLICY "widgets_insert_owner" ON public.widgets
  FOR INSERT WITH CHECK (public.is_project_owner(project_id));
CREATE POLICY "widgets_update_owner" ON public.widgets
  FOR UPDATE USING (public.is_project_owner(project_id))
  WITH CHECK (public.is_project_owner(project_id));
CREATE POLICY "widgets_delete_owner" ON public.widgets
  FOR DELETE USING (public.is_project_owner(project_id));

-- subscriptions
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());
```

---

## 付録B: ER図（テキスト表現）

```
auth.users (Supabase管理)
    |
    | 1:1 (CASCADE)
    v
public.users
    |
    |--- 1:N ---> public.projects
    |                  |
    |                  |--- 1:N ---> public.testimonials
    |                  |
    |                  |--- 1:N ---> public.widgets
    |
    |--- 1:N ---> public.subscriptions
```

---

## 付録C: Supabase Storage設計（アバター画像）

テスティモニアルの `author_avatar_url` やプロジェクトの `logo_url` に使う画像を保存するためのStorage設定。

```sql
-- Storage バケット作成（Supabase ダッシュボードまたはSQL）
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('logos', 'logos', true);

-- avatars バケットのRLS: 誰でもアップロード可能（フォームからの顔写真）
CREATE POLICY "avatars_insert_public"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- logos バケットのRLS: 認証済みユーザーのみアップロード可能
CREATE POLICY "logos_insert_authenticated"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "logos_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

-- logos の削除: アップロードしたユーザーのみ
CREATE POLICY "logos_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'logos' AND auth.uid() = owner);
```

**ファイルサイズ制限**はSupabaseダッシュボードの Storage > Settings で設定:
- avatars: 2MB
- logos: 5MB
