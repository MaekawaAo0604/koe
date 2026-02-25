# Koe (声) - テスティモニアル収集・表示プラットフォーム

> 日本初の「お客様の声」収集 → 管理 → Webサイト埋め込みをワンストップで行うSaaS

## What is Koe?

フリーランス・個人開発者・SaaS企業が「お客様の声（テスティモニアル）」を
**収集 → 管理 → Webサイトに埋め込み表示** するためのプラットフォーム。

### 解決する課題

日本では「お客様の声」の収集〜表示が完全に手作業:

1. Googleフォームで感想を集める
2. 返ってきたテキストをコピペ
3. 自分でHTMLを書いてサイトに貼る
4. 新しい感想が来るたびに手動で更新

**Koe を使えば、フォームのURL共有 → 自動収集 → 1行のコード埋め込みで完了。**

## How it works

```
Step 1: 収集
  お客様にフォームURLを共有 → テキスト/動画で感想が自動で集まる

Step 2: 管理
  管理画面で承認/非承認、タグ付け、★評価で整理

Step 3: 表示
  <script> タグ1行をサイトに貼るだけで「Wall of Love」が表示される
```

## Target Users

| ターゲット | ニーズ |
|-----------|--------|
| フリーランス | ポートフォリオに実績の声を載せたい |
| 個人開発者 | LPの成約率を上げたい |
| SaaS企業 | お客様の声を体系的に管理・活用したい |
| コーチ/コンサル | クライアントの成功事例を見せたい |
| Web制作会社 | クライアントのサイトにウィジェットを導入したい |

## Pricing (planned)

| Plan | Price | Contents |
|------|-------|----------|
| Free | ¥0 | 10件まで、ウィジェット無制限、バッジ表示あり |
| Pro | ¥980/月 | 無制限、バッジ削除、カスタムデザイン、複数プロジェクト |

戦略: 無料プランを広く使ってもらいPLG（Powered by Koeバッジ）で回す。有料転換はバッジ削除とカスタムデザインがメインのトリガー。

## Tech Stack (planned)

- Frontend: Next.js + Tailwind CSS
- Backend: Next.js API Routes
- DB: PostgreSQL (Supabase)
- Auth: Supabase Auth
- Payment: Stripe
- Widget: Vanilla JS (埋め込み用)
- Hosting: Vercel

## Project Status

**Phase 0: Planning** - ビジネスモデル設計・MVP仕様策定中

## Docs

- [ROADMAP.md](./ROADMAP.md) - ビジネスロードマップ
- [docs/mvp-spec.md](./docs/mvp-spec.md) - MVP機能仕様
- [docs/research/competitor-analysis.md](./docs/research/competitor-analysis.md) - 競合分析
- [docs/research/market-research.md](./docs/research/market-research.md) - 市場調査
- [docs/growth-strategy.md](./docs/growth-strategy.md) - 成長戦略

## Reference

- [Senja.io](https://senja.io/) - 海外の成功事例 ($83K MRR, 2人チーム)
