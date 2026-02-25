# 実装計画

各マイルストーンは**デプロイ→動作確認可能な単位**で分割されている。
マイルストーン完了ごとにVercelにデプロイし、記載の動確項目で検証すること。

---

## Milestone 1: プロジェクト初期化 + DB セットアップ

**ゴール**: Next.jsアプリがVercelにデプロイされ、Supabaseにテーブルが存在する状態

### タスク

- [ ] **1-1**: Next.js プロジェクト初期化（App Router, TypeScript, Tailwind CSS, src/ ディレクトリ）
  - `npx create-next-app@latest --typescript --tailwind --app --src-dir`
  - `.env.local` テンプレート作成（`.env.example`）
  - `.gitignore` に `.env.local` を確認
- [ ] **1-2**: shadcn/ui セットアップ + 基本UIコンポーネント導入
  - `npx shadcn@latest init`
  - Button, Card, Input, Label, Dialog, Toast (Sonner), Badge, Select, Tabs を追加
- [ ] **1-3**: Supabase クライアント初期化（3種類）
  - `lib/supabase/client.ts` — ブラウザ用（`createBrowserClient`）
  - `lib/supabase/server.ts` — Server Component / Route Handler用（`createServerClient`）
  - `lib/supabase/service-role.ts` — Webhook用（`createClient` + service_role key）
  - `@supabase/ssr` パッケージインストール
- [ ] **1-4**: Supabase DBマイグレーションファイル作成
  - `supabase/migrations/` にSQLファイルを配置（`docs/specs/supabase-design.md` 付録Aのステップ1〜6を分割）
  - カスタム型 → テーブル → 関数/トリガー → RLSヘルパー → RLS有効化 → RLSポリシー → Storageバケット → stripe_events
  - `supabase db push` で適用確認
- [ ] **1-5**: Vercel デプロイ設定
  - Vercelプロジェクト作成 + GitHubリポジトリ連携
  - 環境変数設定（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`）
  - デプロイ確認

### 動確項目
- [ ] Vercelに初期ページが表示される
- [ ] Supabase ダッシュボードで全テーブル（users, projects, testimonials, widgets, subscriptions, stripe_events）が存在する
- [ ] RLSが全テーブルで有効になっている
- [ ] Storage バケット（avatars, logos）が存在する

---

## Milestone 2: 認証フロー

**ゴール**: サインアップ → ログイン → ダッシュボード → ログアウト が動く

### タスク

- [ ] **2-1**: Middleware 実装（トークンリフレッシュ + 認証ガード）
  - `src/middleware.ts` — Supabase Auth トークンリフレッシュ
  - 未認証で `/dashboard*` アクセス時に `/login` へリダイレクト
  - matcher設定（静的ファイル除外）
- [ ] **2-2**: 認証ページ実装
  - `(auth)/login/page.tsx` — ログインフォーム（メール+パスワード）
  - `(auth)/register/page.tsx` — サインアップフォーム（名前+メール+パスワード）
  - `(auth)/forgot-password/page.tsx` — パスワードリセット申請
  - `(auth)/reset-password/page.tsx` — 新パスワード設定
  - `components/auth/login-form.tsx`, `register-form.tsx`, `oauth-button.tsx`
- [ ] **2-3**: Google OAuth 対応
  - `(auth)/auth/callback/route.ts` — OAuth コールバック処理
  - Supabase ダッシュボードで Google OAuth 有効化
  - OAuthButton コンポーネント
- [ ] **2-4**: ダッシュボードレイアウト（認証必須）
  - `(dashboard)/layout.tsx` — サイドバー + ヘッダー + サインアウト
  - `(dashboard)/dashboard/page.tsx` — 仮のプロジェクト一覧ページ（空状態）
  - `components/layout/header.tsx`, `sidebar.tsx`
- [ ] **2-5**: 型定義 + ユーティリティ
  - `types/database.ts` — Supabase 生成型（`supabase gen types typescript`）
  - `lib/plan.ts` — `getUserPlan()` ユーティリティ

### 動確項目
- [ ] メール+パスワードでサインアップ → 確認メール受信 → 確認後ダッシュボード表示
- [ ] Google OAuth でサインイン → ダッシュボード表示
- [ ] ログアウト → トップページへリダイレクト
- [ ] 未認証で `/dashboard` にアクセス → `/login` にリダイレクト
- [ ] パスワードリセットフローが完了する
- [ ] Supabase `public.users` にプロファイルが自動作成されている

---

## Milestone 3: プロジェクト CRUD + ダッシュボード

**ゴール**: プロジェクトの作成・編集・削除ができ、フォームURLがコピーできる

### タスク

- [ ] **3-1**: プロジェクト API 実装
  - `api/projects/route.ts` — GET（一覧 + テスティモニアル件数）、POST（作成、Freeプラン1つ制限チェック）
  - `api/projects/[id]/route.ts` — GET、PATCH、DELETE
  - `lib/validators/project.ts` — Zod スキーマ（createProjectSchema, updateProjectSchema）
- [ ] **3-2**: ダッシュボード画面（プロジェクト一覧）
  - `(dashboard)/dashboard/page.tsx` — Server Componentでプロジェクト一覧取得
  - `components/dashboard/project-card.tsx` — プロジェクトカード（名前、テスティモニアル件数）
  - `components/dashboard/project-list.tsx` — 一覧 + 空状態表示
  - 「+ 新しいプロジェクト作成」ボタン
- [ ] **3-3**: プロジェクト作成画面
  - `(dashboard)/projects/new/page.tsx` — プロジェクト名入力、スラッグ自動生成
  - Freeプラン制限時のアップグレード促進UI
- [ ] **3-4**: プロジェクト設定画面
  - `(dashboard)/projects/[projectId]/settings/page.tsx`
  - プロジェクト名、スラッグ、ロゴアップロード、ブランドカラー編集
  - フォームURL表示 + CopyButton
  - プロジェクト削除（確認ダイアログ付き）
  - `components/shared/copy-button.tsx`

### 動確項目
- [ ] プロジェクト作成 → ダッシュボードに表示される
- [ ] プロジェクト名・ブランドカラー編集 → 保存される
- [ ] ロゴアップロード → Supabase Storage に保存される
- [ ] フォームURL コピーボタン → クリップボードにコピーされる
- [ ] プロジェクト削除 → ダッシュボードから消える
- [ ] Freeプランで2つ目のプロジェクト作成 → エラー表示

---

## Milestone 4: テスティモニアル収集フォーム

**ゴール**: フォームURLからテスティモニアルを投稿でき、件数制限・レートリミットが効く

### タスク

- [ ] **4-1**: 収集フォームページ実装
  - `f/[slug]/page.tsx` — Server Componentでプロジェクト取得（slug指定）、ブランド設定反映
  - `components/forms/collection-form.tsx` — Client Component（React Hook Form + Zod）
  - `components/forms/star-rating.tsx` — ★評価入力コンポーネント
  - サンクスメッセージ画面
  - 404ページ（存在しないスラッグ）
- [ ] **4-2**: テスティモニアル投稿 API
  - `api/projects/[id]/testimonials/route.ts` — POST（公開、認証不要）
  - `lib/validators/testimonial.ts` — Zod スキーマ
  - レートリミット実装（Upstash Redis, `@upstash/ratelimit`, 10件/時間/IP）
  - 顔写真アップロード（Supabase Storage avatars バケット、2MB制限）
- [ ] **4-3**: Powered by Koe バッジ（フォーム版）
  - `components/shared/powered-by-badge.tsx` — バッジコンポーネント
  - Freeプラン時のみ表示（プロジェクトオーナーのplanをDBから取得）
  - クリック → LP（UTMパラメータ付き）

### 動確項目
- [ ] `/f/:slug` にアクセス → ブランド設定に合わせたフォーム表示
- [ ] 名前 + ★評価 + 感想を入力して送信 → サンクスメッセージ表示
- [ ] Supabase DBに `status=pending` でテスティモニアルが保存されている
- [ ] 必須項目未入力 → バリデーションエラー
- [ ] Freeプラン10件到達後の投稿 → エラーメッセージ
- [ ] 11回連続投稿 → 429エラー（レートリミット）
- [ ] 存在しないスラッグ → 404ページ
- [ ] 顔写真アップロード → Storage に保存、URLがテスティモニアルに紐付く
- [ ] Freeプランのフォームに「Powered by Koe」バッジ表示

---

## Milestone 5: テスティモニアル管理画面

**ゴール**: 管理画面でテスティモニアルの承認・非承認・タグ付け・フィルタ・削除ができる

### タスク

- [ ] **5-1**: テスティモニアル一覧 API
  - `api/projects/[id]/testimonials/route.ts` — GET（フィルタ: status, rating, tags対応）
  - `api/testimonials/[id]/route.ts` — PATCH（承認/非承認、タグ、表示名）、DELETE
- [ ] **5-2**: テスティモニアル管理画面 UI
  - `(dashboard)/projects/[projectId]/page.tsx` — テスティモニアル一覧
  - `components/testimonials/testimonial-card.tsx` — カード（承認/非承認ボタン、タグ、削除）
  - `components/testimonials/testimonial-list.tsx` — 一覧表示
  - `components/testimonials/testimonial-filters.tsx` — フィルタUI（★、状態、タグ）
  - `components/testimonials/usage-indicator.tsx` — 「3/10件」表示（Freeプラン時）
  - 削除確認ダイアログ

### 動確項目
- [ ] テスティモニアル一覧がカード形式で表示される（作成日時降順）
- [ ] 「承認」クリック → status が approved に更新
- [ ] 「非承認」クリック → status が rejected に更新
- [ ] タグ追加 → 保存される
- [ ] ★評価・状態・タグでフィルタ → 該当するもののみ表示
- [ ] 表示名編集 → 保存される
- [ ] 削除 → 確認ダイアログ → 完全削除
- [ ] Freeプラン時「3/10件」の表示
- [ ] author_email が管理画面でのみ表示されている

---

## Milestone 6: ウィジェット + Wall of Love

**ゴール**: 埋め込みコードをHTMLに貼り付けてウィジェットが表示される。Wall of Love公開ページが機能する

### タスク

- [ ] **6-1**: ウィジェット API
  - `api/widgets/route.ts` — POST（作成、プラン別タイプ制限）
  - `api/widgets/[id]/route.ts` — PATCH、DELETE
  - `api/widgets/[id]/data/route.ts` — GET（公開、承認済みのみ、author_email除外、Cache-Control設定）
- [ ] **6-2**: ウィジェット設定画面
  - `(dashboard)/projects/[projectId]/widgets/page.tsx` — ウィジェット一覧 + 作成
  - `(dashboard)/projects/[projectId]/widgets/[widgetId]/page.tsx` — ウィジェット設定
  - `components/widgets/widget-config-form.tsx` — タイプ選択、デザイン設定フォーム
  - `components/widgets/widget-preview.tsx` — リアルタイムプレビュー
  - `components/widgets/embed-code-copy.tsx` — 埋め込みコードコピー
  - Freeプラン制限（Wall of Loveのみ、タイプ選択無効化）
- [ ] **6-3**: widget.js 実装（Vanilla JS + Shadow DOM）
  - `widget/src/` — エントリポイント、レンダリング、API通信、テンプレート3種（wall, carousel, list）
  - Shadow DOM 内にスタイル注入 + テスティモニアル描画
  - Powered by Koe バッジ（plan=free 時）
  - Rollup ビルド設定（UMD, gzip後30KB以下）
  - `public/widget.js` に出力
- [ ] **6-4**: Wall of Love 公開ページ
  - `wall/[slug]/page.tsx` — 承認済みテスティモニアルのグリッド表示
  - Powered by Koe バッジ（Freeプラン時）
  - Wall of Love URL コピーボタン（ウィジェット設定画面に追加）

### 動確項目
- [ ] ウィジェット設定画面でタイプ・デザインを変更 → プレビューがリアルタイム更新
- [ ] 埋め込みコードをコピー → 別HTMLに貼り付け → ウィジェットが表示される
- [ ] ウィジェットに承認済みテスティモニアルのみ表示される
- [ ] ウィジェットに author_email が含まれていない（DevTools で確認）
- [ ] Freeプラン → ウィジェットに「Powered by Koe」バッジ表示、Wall of Loveのみ選択可
- [ ] `/wall/:slug` にアクセス → グリッド形式で承認済みテスティモニアル表示
- [ ] widget.js が gzip 後 30KB 以下
- [ ] ウィジェットデータAPIのレスポンスに `Cache-Control: s-maxage=300` が設定されている

---

## Milestone 7: 課金（Stripe 連携）

**ゴール**: テストカードでFree→Proアップグレード、Customer Portalでキャンセルが動く。プラン制限が切り替わる

### タスク

- [ ] **7-1**: Stripe セットアップ
  - Stripe アカウント設定（Product/Price作成: Koe Pro ¥980/月）
  - 環境変数設定（`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`）
  - Customer Portal 設定（キャンセル: 期間終了時）
  - Webhook エンドポイント登録
- [ ] **7-2**: Billing API 実装
  - `api/billing/checkout/route.ts` — Checkout Session 作成（既にPro時は400）
  - `api/billing/portal/route.ts` — Customer Portal Session 作成
  - `lib/stripe/client.ts` — Stripe インスタンス
- [ ] **7-3**: Webhook ハンドラ実装
  - `api/webhooks/stripe/route.ts` — メインハンドラ（署名検証 + 冪等性チェック）
  - `lib/stripe/webhooks.ts` — 各イベントハンドラ
    - `checkout.session.completed` → subscriptions UPSERT + users.plan = 'pro'
    - `customer.subscription.updated` → status更新
    - `customer.subscription.deleted` → users.plan = 'free'
    - `invoice.payment_failed` → status = 'past_due'
    - `invoice.payment_succeeded` → status = 'active' + period_end更新
- [ ] **7-4**: 課金画面 UI
  - `(dashboard)/billing/page.tsx` — プラン表示、アップグレードボタン、管理ボタン
  - `components/billing/plan-card.tsx` — Free/Pro プラン比較カード
  - `components/billing/upgrade-button.tsx` — Checkout へリダイレクト
  - `components/billing/payment-status-banner.tsx` — past_due時バナー
  - 決済成功後のポーリングUI（「処理中...」→ Pro表示切替）
- [ ] **7-5**: プラン制限の全体適用
  - プロジェクト数制限（Free: 1、Pro: 無制限）
  - ウィジェットタイプ制限（Free: Wall of Loveのみ）
  - Powered by Koeバッジ切替（Pro: 非表示可）
  - カスタムブランドカラー制限（Free: 不可 → Pro: 可）※設計に応じて

### 動確項目
- [ ] Freeプランで「Proにアップグレード」→ Stripe Checkout → テストカード決済 → Pro反映
- [ ] 課金画面に「Pro」プラン + 次回請求日 表示
- [ ] 「プランを管理」→ Customer Portal → キャンセル → period_end まで Pro
- [ ] period_end 後に plan = 'free' に戻る（Stripe CLIで `customer.subscription.deleted` をトリガー）
- [ ] 既にProで Checkout → 400エラー
- [ ] 支払い失敗 → past_due バナー表示（Stripe CLIで `invoice.payment_failed` をトリガー）
- [ ] Webhook重複イベント → 2回目は処理スキップ
- [ ] Pro → ウィジェットタイプ全選択可、バッジ非表示可、プロジェクト複数作成可
- [ ] Free → 制限が正しく適用される

---

## Milestone 8: LP + 仕上げ + 本番準備

**ゴール**: LPが完成し、全フローが本番環境で動作する

### タスク

- [ ] **8-1**: LP ページ実装
  - `app/page.tsx` — ヒーロー、機能説明、デモ Wall of Love（ドッグフーディング）、料金プラン比較、CTA
  - レスポンシブ対応
  - 「無料で始める」→ `/register` へリダイレクト
- [ ] **8-2**: SEO + メタデータ
  - `app/layout.tsx` — metadata 設定（title, description, OGP画像）
  - `robots.txt`, `sitemap.xml`
  - 各ページの metadata export
- [ ] **8-3**: エラーページ + エッジケース
  - `app/not-found.tsx` — 404ページ
  - `app/error.tsx` — 500エラーページ
  - `app/loading.tsx` — ローディング状態
- [ ] **8-4**: 本番環境設定
  - Vercel 本番環境変数設定（Stripe Live キー、本番 Supabase）
  - Stripe 本番 Webhook エンドポイント登録
  - Supabase Auth 設定（Site URL、Redirect URLs を本番ドメインに）
  - カスタムドメイン設定（任意）
- [ ] **8-5**: 最終動作確認
  - 全マイルストーンの動確項目を本番環境で再確認
  - Lighthouse パフォーマンス計測
  - セキュリティチェック（RLS、service_role key 非露出、CORS）

### 動確項目
- [ ] LP が表示され、デモ Wall of Love が動作する
- [ ] 「無料で始める」→ サインアップ → プロジェクト作成 → フォーム投稿 → 承認 → ウィジェット表示 の全フロー
- [ ] Stripe 本番キーでの決済テスト（テストモードから切替前に）
- [ ] OGP画像がSNSシェア時に表示される
- [ ] モバイルでの表示が崩れない
