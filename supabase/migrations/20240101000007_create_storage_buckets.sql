-- ============================================================
-- Step 7: Storage バケット作成
-- ============================================================

-- avatars バケット: テスティモニアルの author_avatar_url 用（公開）
-- logos バケット: プロジェクトの logo_url 用（公開）
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('logos', 'logos', true);

-- ------------------------------------------------------------
-- avatars バケットの RLS
-- ------------------------------------------------------------

-- INSERT: 誰でもアップロード可能（フォームからの顔写真）
CREATE POLICY "avatars_insert_public"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

-- SELECT: 誰でも参照可能
CREATE POLICY "avatars_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- ------------------------------------------------------------
-- logos バケットの RLS
-- ------------------------------------------------------------

-- INSERT: 認証済みユーザーのみアップロード可能
CREATE POLICY "logos_insert_authenticated"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

-- SELECT: 誰でも参照可能
CREATE POLICY "logos_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'logos');

-- DELETE: アップロードしたユーザーのみ
CREATE POLICY "logos_delete_own"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'logos' AND auth.uid() = owner);
