-- ============================================================
-- Step 6: RLSポリシー
-- ============================================================

-- ------------------------------------------------------------
-- users テーブル
-- ------------------------------------------------------------

-- SELECT: 自分のデータのみ参照可能
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- UPDATE: 自分のデータのみ更新可能
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: Auth トリガー（SECURITY DEFINER）経由の自動作成用
-- 万が一クライアントから直接 INSERT された場合も自分の ID のみ許可
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- DELETE: ユーザーの直接削除は禁止（アカウント削除はサーバーサイドで処理）
-- DELETE ポリシーを作成しないことで拒否される

-- ------------------------------------------------------------
-- projects テーブル
-- ------------------------------------------------------------

-- SELECT: 自分のプロジェクトのみ参照可能
CREATE POLICY "projects_select_own"
  ON public.projects
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: 認証済みユーザーが自分の user_id で作成
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

-- ------------------------------------------------------------
-- testimonials テーブル
-- ------------------------------------------------------------

-- INSERT: 認証不要（anon/public からのフォーム投稿を許可）
-- status は pending のみ許可（承認済みでの投稿を防ぐ）
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

-- ------------------------------------------------------------
-- widgets テーブル
-- ------------------------------------------------------------

-- SELECT（公開）: widget.js から取得するため誰でも参照可能
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

-- ------------------------------------------------------------
-- subscriptions テーブル
-- ------------------------------------------------------------

-- SELECT: 自分のサブスクリプションのみ参照可能
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: Stripe Webhook から service_role で操作するため
-- クライアントからの直接操作は全て禁止（ポリシーなし = 拒否）
