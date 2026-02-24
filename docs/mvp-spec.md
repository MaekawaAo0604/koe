# Koe MVP Spec - 機能仕様書

## MVP scope: 1週間で作る最小構成

### 概要

```
ユーザーフロー:
  サービス提供者（Koeユーザー）
    1. Koeに登録
    2. プロジェクト作成
    3. 収集フォームのURLを取得
    4. お客さんにURLを共有
    5. 管理画面でテスティモニアルを承認
    6. ウィジェットの埋め込みコードをコピー
    7. 自分のサイトに貼る → 完了

  エンドユーザー（お客さん）
    1. フォームURLを開く
    2. 名前・会社名・感想・★評価を入力
    3. 送信 → 完了
```

---

## 画面一覧

### 1. LP / マーケティングサイト
- サービス説明
- デモのWall of Love埋め込み（ドッグフーディング）
- 料金プラン
- CTA: 「無料で始める」

### 2. 認証
- サインアップ（メール + パスワード or Google OAuth）
- サインイン
- パスワードリセット

### 3. ダッシュボード
- プロジェクト一覧
- 各プロジェクトのテスティモニアル数
- 「+ 新しいプロジェクト作成」ボタン

### 4. プロジェクト設定
- プロジェクト名
- ロゴ/アイコン
- 収集フォームのカスタマイズ
  - 質問項目の編集（デフォルト: 名前、会社名、役職、感想、★評価）
  - カスタム質問追加（Phase 2）
  - ブランドカラー設定
- フォームURL表示 + コピーボタン

### 5. テスティモニアル一覧（管理画面）
- 全件一覧（カード形式）
- フィルタ: ★評価、承認状態、タグ
- 各テスティモニアルに対して:
  - 承認 / 非承認
  - タグ付け
  - 表示名の編集
  - 削除

### 6. ウィジェット設定 & プレビュー
- ウィジェットタイプ選択:
  - Wall of Love（グリッド表示）
  - カルーセル（横スクロール）
  - リスト（縦並び）
- デザインカスタマイズ:
  - テーマ（ライト/ダーク）
  - カラー
  - 角丸・影
  - フォント
- リアルタイムプレビュー
- 埋め込みコード表示 + コピーボタン:
  ```html
  <script src="https://koe.example.com/widget.js" data-project="xxx"></script>
  ```
- Wall of Love 公開ページURL

### 7. 収集フォーム（エンドユーザー向け）
- プロジェクトのブランドに合わせたデザイン
- 入力項目:
  - 名前（必須）
  - 会社名 / 肩書き（任意）
  - メールアドレス（任意、非公開）
  - ★評価（1-5）
  - 感想テキスト（必須）
  - 顔写真アップロード（任意）
- 送信完了画面（サンクスメッセージ）
- 「Powered by Koe」バッジ

### 8. 課金画面
- 現在のプラン表示
- プランアップグレード / ダウングレード
- Stripe Checkout へのリダイレクト
- 請求履歴

---

## データモデル（概要）

### users
```
id: uuid
email: string
name: string
avatar_url: string?
plan: enum (free, pro, business)
stripe_customer_id: string?
created_at: timestamp
```

### projects
```
id: uuid
user_id: uuid (FK -> users)
name: string
logo_url: string?
brand_color: string (hex)
form_config: jsonb (質問項目のカスタマイズ)
created_at: timestamp
```

### testimonials
```
id: uuid
project_id: uuid (FK -> projects)
status: enum (pending, approved, rejected)
author_name: string
author_title: string?
author_company: string?
author_email: string?
author_avatar_url: string?
rating: integer (1-5)
content: text
tags: text[]
created_at: timestamp
```

### widgets
```
id: uuid
project_id: uuid (FK -> projects)
type: enum (wall, carousel, list)
config: jsonb (デザイン設定)
created_at: timestamp
```

### subscriptions
```
id: uuid
user_id: uuid (FK -> users)
stripe_subscription_id: string
plan: enum (pro, business)
status: enum (active, canceled, past_due)
current_period_end: timestamp
created_at: timestamp
```

---

## API エンドポイント（概要）

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/signout`

### Projects
- `GET /api/projects` - 一覧
- `POST /api/projects` - 作成
- `GET /api/projects/:id` - 詳細
- `PATCH /api/projects/:id` - 更新
- `DELETE /api/projects/:id` - 削除

### Testimonials
- `GET /api/projects/:id/testimonials` - 一覧
- `POST /api/projects/:id/testimonials` - 投稿（公開API、フォームから）
- `PATCH /api/testimonials/:id` - 更新（承認/タグ等）
- `DELETE /api/testimonials/:id` - 削除

### Widgets
- `GET /api/projects/:id/widgets` - 一覧
- `POST /api/projects/:id/widgets` - 作成
- `PATCH /api/widgets/:id` - 更新
- `GET /api/widgets/:id/data` - ウィジェット表示用データ（公開API）

### Billing
- `POST /api/billing/checkout` - Stripe Checkout セッション作成
- `POST /api/billing/portal` - Stripe Customer Portal
- `POST /api/webhooks/stripe` - Stripe Webhook

---

## ウィジェット埋め込みの仕組み

```
1. ユーザーが管理画面で埋め込みコードをコピー:
   <script src="https://koe.example.com/widget.js" data-project="xxx" data-widget="yyy"></script>

2. widget.js がロードされると:
   a. data-project と data-widget 属性を読み取る
   b. GET /api/widgets/:id/data を叩いて承認済みテスティモニアルを取得
   c. Shadow DOM 内にウィジェットをレンダリング（ホストサイトのCSSに影響されない）
   d. 「Powered by Koe」バッジを表示（無料プラン）

3. ウィジェットは iframe ではなく Shadow DOM を使用:
   - SEOに有利（コンテンツがインデックスされる）
   - パフォーマンスが良い
   - ホストサイトのスタイルと干渉しない
```

---

## 非機能要件

### パフォーマンス
- widget.js のサイズ: 30KB 以下（gzip後）
- ウィジェットデータ取得: 200ms 以下
- フォーム表示: 1秒以内

### セキュリティ
- フォーム投稿: レートリミット（1 IP あたり 10件/時間）
- ウィジェットAPI: CORSで許可ドメインを制限（有料プラン）
- 管理画面: 認証必須
- CSRFトークン

### スケーラビリティ
- Vercel Serverless Functions でスタート
- DB は Supabase（PostgreSQL）
- ウィジェットデータは CDN キャッシュ（5分TTL）

---

## MVP から外すもの（Phase 2以降）

- [ ] 動画テスティモニアル
- [ ] SNSインポート（X, Googleレビュー, 食べログ）
- [ ] AI感情分析
- [ ] A/Bテスト
- [ ] チーム機能（複数メンバー）
- [ ] API key 発行
- [ ] Webhook
- [ ] 多言語対応
- [ ] Notion / STUDIO / ペライチ連携
- [ ] アフィリエイトプログラム
