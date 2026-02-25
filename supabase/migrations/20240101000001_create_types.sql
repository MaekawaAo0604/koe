-- ============================================================
-- Step 1: カスタム型
-- ============================================================

-- プラン種別
CREATE TYPE public.plan_type AS ENUM ('free', 'pro');

-- テスティモニアルの承認状態
CREATE TYPE public.testimonial_status AS ENUM ('pending', 'approved', 'rejected');

-- ウィジェットの表示タイプ
CREATE TYPE public.widget_type AS ENUM ('wall', 'carousel', 'list');

-- サブスクリプションの状態
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due');
