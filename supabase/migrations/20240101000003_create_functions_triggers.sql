-- ============================================================
-- Step 3: 共通関数・トリガー
-- ============================================================

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに updated_at トリガーを設定
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

-- Auth連携: 新規ユーザー作成時のプロファイル自動作成
-- auth.users への INSERT をトリガーにして public.users にプロファイルを挿入する
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

-- テスティモニアル件数制限チェック（Freeプラン: プロジェクトあたり最大10件）
CREATE OR REPLACE FUNCTION public.check_testimonial_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id      uuid;
  v_plan         public.plan_type;
  v_current_count integer;
  v_limit        integer;
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

  -- 現在の件数を取得（status に関わらず全件カウント）
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
