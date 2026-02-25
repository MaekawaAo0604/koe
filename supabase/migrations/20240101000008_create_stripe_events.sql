-- ============================================================
-- Step 8: stripe_events テーブル（冪等性管理）
-- ============================================================

-- Stripe Webhook イベントの重複処理を防ぐためのテーブル
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id           text PRIMARY KEY,
  type         text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stripe_events IS 'Stripe Webhookイベントの処理済み管理テーブル。冪等性を保証する。';

-- ------------------------------------------------------------
-- subscriptions テーブルへの追加変更（Stripe連携に必要）
-- ------------------------------------------------------------

-- subscription_status に 'deleted' を追加
-- （supabase-design.md では active, canceled, past_due のみ定義されているため追加）
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'deleted';

-- subscriptions の user_id にユニーク制約（1ユーザー1サブスクリプション）
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
