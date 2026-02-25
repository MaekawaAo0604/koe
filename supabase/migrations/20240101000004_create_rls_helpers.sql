-- ============================================================
-- Step 4: RLSヘルパー関数
-- ============================================================

-- 現在のログインユーザーの ID を取得（auth.uid() のラッパー）
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 指定された project_id のオーナー（user_id）を返す
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
