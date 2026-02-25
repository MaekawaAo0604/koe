#!/bin/bash
set -euo pipefail

# Claude Code のネスト検知を回避
unset CLAUDECODE 2>/dev/null || true

REPO="MaekawaAo0604/koe"
LOG_DIR="$(dirname "$0")/../logs"
mkdir -p "$LOG_DIR"

MILESTONES=(
  "milestone:1-init"
  "milestone:2-auth"
  "milestone:3-project"
  "milestone:4-form"
  "milestone:5-admin"
  "milestone:6-widget"
  "milestone:7-billing"
  "milestone:8-lp"
)

echo "=== Koe 自動実装開始: $(date) ==="

for LABEL in "${MILESTONES[@]}"; do
  echo ""
  echo "=============================="
  echo "📦 Milestone: $LABEL"
  echo "=============================="

  # このマイルストーンのIssue番号を取得（昇順）
  ISSUES=$(GH_HOST=github.com gh issue list --repo "$REPO" --label "$LABEL" --state open --json number --jq '.[].number' | sort -n)

  if [ -z "$ISSUES" ]; then
    echo "⏭️  オープンなIssueなし、スキップ"
    continue
  fi

  for ISSUE_NUM in $ISSUES; do
    ISSUE_TITLE=$(GH_HOST=github.com gh issue view "$ISSUE_NUM" --repo "$REPO" --json title --jq '.title')
    ISSUE_BODY=$(GH_HOST=github.com gh issue view "$ISSUE_NUM" --repo "$REPO" --json body --jq '.body')
    LOGFILE="$LOG_DIR/issue-${ISSUE_NUM}.log"

    echo ""
    echo "🔨 Issue #${ISSUE_NUM}: ${ISSUE_TITLE}"
    echo "   ログ: ${LOGFILE}"

    # Claude Code をヘッドレスで実行（全ツール許可）
    claude -p --dangerously-skip-permissions "$(cat <<PROMPT
あなたはKoeプロジェクトの実装担当です。以下のGitHub Issueを実装してください。

## リポジトリ情報
- ワーキングディレクトリ: /Users/ao-maekawa/projects/koe
- 技術設計書: .kiro/specs/koe-testimonial-saas/design.md
- 要件書: .kiro/specs/koe-testimonial-saas/requirements.md
- DB設計: docs/specs/supabase-design.md
- 認証設計: docs/specs/auth-flow.md
- Stripe設計: docs/specs/stripe-integration.md

## Issue #${ISSUE_NUM}: ${ISSUE_TITLE}

${ISSUE_BODY}

## 実装ルール
1. 設計書・仕様書に従って実装する（必ず設計書を読んでから実装に入ること）
2. 既存のコードベースのパターンに合わせる（既存ファイルを必ず確認してからコードを書く）
3. 実装後、必ず \`npm run build\` を実行してビルドが通ることを確認する。エラーがあれば修正してから次に進む
4. ビルド確認後、コミットしてpushする（コミットメッセージに "Closes #${ISSUE_NUM}" を含める）
5. テストが書ける部分はテストも書く
6. 動確項目をセルフチェックし、問題があれば修正する
7. .env.local の値は変更しない（既に設定済み）
8. useSearchParams()を使うコンポーネントは必ずSuspense boundaryで囲む
9. "use client" が必要なコンポーネントには必ず付ける
PROMPT
)" > "$LOGFILE" 2>&1

    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
      echo "   ✅ 完了"
      # Issue をクローズ
      GH_HOST=github.com gh issue close "$ISSUE_NUM" --repo "$REPO" --comment "自動実装完了 ✅" 2>/dev/null || true
    else
      echo "   ❌ エラー (exit code: $EXIT_CODE)"
      echo "   ログを確認: cat $LOGFILE"
      # エラーでも続行（次のIssueへ）
    fi
  done

  echo ""
  echo "📦 ${LABEL} 完了 — Vercel自動デプロイを確認してください"
done

echo ""
echo "=== 全マイルストーン完了: $(date) ==="
echo "=== ログ: ${LOG_DIR}/ ==="
