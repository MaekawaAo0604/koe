-- ============================================================
-- Step 2: テーブル作成
-- ============================================================

-- users
-- Supabase Auth の auth.users と 1:1 対応するプロファイルテーブル
CREATE TABLE public.users (
  id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              text NOT NULL,
  name               text NOT NULL DEFAULT '',
  avatar_url         text,
  plan               public.plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id text UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'ユーザープロファイル。auth.usersと1:1対応。';
COMMENT ON COLUMN public.users.plan IS '現在の契約プラン。subscriptionsテーブルと整合性を保つこと。';

-- projects
CREATE TABLE public.projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  logo_url    text,
  brand_color text NOT NULL DEFAULT '#6366f1',
  form_config jsonb NOT NULL DEFAULT '{
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
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT projects_brand_color_hex CHECK (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  CONSTRAINT projects_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

-- user_id でのフィルタは頻出（ダッシュボードのプロジェクト一覧）
CREATE INDEX idx_projects_user_id ON public.projects(user_id);

COMMENT ON TABLE public.projects IS 'テスティモニアル収集プロジェクト。';
COMMENT ON COLUMN public.projects.slug IS 'フォームURL用のスラッグ。例: /f/my-project';
COMMENT ON COLUMN public.projects.form_config IS '収集フォームの質問項目設定。JSON Schema準拠。';

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

-- project_id + status の複合インデックス
-- ウィジェット表示時に「特定プロジェクトのapproved」を取得するクエリが最頻出
CREATE INDEX idx_testimonials_project_status ON public.testimonials(project_id, status);

-- 管理画面での created_at ソートに対応
CREATE INDEX idx_testimonials_project_created ON public.testimonials(project_id, created_at DESC);

COMMENT ON TABLE public.testimonials IS 'お客様の声（テスティモニアル）。フォームから公開投稿される。';
COMMENT ON COLUMN public.testimonials.status IS '承認状態。フォーム投稿時はpending、管理者が承認するとapprovedになる。';

-- widgets
CREATE TABLE public.widgets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type       public.widget_type NOT NULL DEFAULT 'wall',
  config     jsonb NOT NULL DEFAULT '{
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- project_id でのフィルタ（管理画面でのウィジェット一覧）
CREATE INDEX idx_widgets_project_id ON public.widgets(project_id);

COMMENT ON TABLE public.widgets IS 'ウィジェット設定。1プロジェクトに複数ウィジェットを作成可能。';
COMMENT ON COLUMN public.widgets.config IS 'ウィジェットのデザイン設定。テーマ、色、角丸など。';

-- subscriptions
CREATE TABLE public.subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  plan                   public.plan_type NOT NULL DEFAULT 'pro',
  status                 public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end     timestamptz NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_plan_not_free CHECK (plan != 'free')
);

-- user_id でのフィルタ（ユーザーのサブスクリプション確認）
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

COMMENT ON TABLE public.subscriptions IS 'Stripeサブスクリプション情報。Webhookで更新される。';
COMMENT ON COLUMN public.subscriptions.status IS 'Stripe側のサブスクリプション状態と同期。';
