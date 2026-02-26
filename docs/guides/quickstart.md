# Koe 埋め込みクイックスタート（30秒）

お客様の声をサイトに表示するまで、4ステップで完了します。

---

## ステップ 1: ウィジェットを作成

ダッシュボード → プロジェクト → 「ウィジェット」タブ → 「新規作成」

表示タイプ（Wall of Love / カルーセル / リスト）とデザインを選びます。

## ステップ 2: 埋め込みコードをコピー

ウィジェット設定画面に表示される埋め込みコードをコピーします。

```html
<script src="https://あなたのURL/widget.js" data-project="あなたのプロジェクトID" data-widget="あなたのウィジェットID"></script>
```

「コピー」ボタンを押すだけでクリップボードにコピーされます。

## ステップ 3: サイトに貼る

コピーしたコードを、お客様の声を表示したいページの HTML に貼り付けます。

```html
<body>
  <!-- ページの内容 -->

  <!-- ここにKoeの埋め込みコードを貼る -->
  <script src="https://あなたのURL/widget.js" data-project="xxx" data-widget="yyy"></script>
</body>
```

**貼る場所**: `</body>` の直前がおすすめです。

## ステップ 4: 表示を確認

ページを開いて、お客様の声が表示されていれば完了です。

---

## うまく表示されない？

お使いのプラットフォームに合わせた専用ガイドをご覧ください。

| プラットフォーム | ガイド |
|-----------------|--------|
| STUDIO | [STUDIO 埋め込みガイド](studio.md) |
| WordPress | [WordPress 埋め込みガイド](wordpress.md) |
| Shopify | [Shopify 埋め込みガイド](shopify.md) |
| Next.js | [Next.js 埋め込みガイド](nextjs.md) |
| Google Tag Manager | [GTM 埋め込みガイド](gtm.md) |

それでも解決しない場合は [トラブルシューティング](troubleshooting.md) をご確認ください。
