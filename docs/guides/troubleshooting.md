# Koe 埋め込みトラブルシューティング

お客様の声が正しく表示されない場合、以下の症状から対処法を確認してください。

---

## 症状別の対処法

### 真っ白で何も表示されない

**原因1: 埋め込みコードのURLが間違っている**

ブラウザの DevTools → Network タブで `widget.js` の読み込み状況を確認してください。

- `404 Not Found` → 埋め込みコードの `src` URLが正しいか確認
- `ERR_NAME_NOT_RESOLVED` → ドメイン名が間違っている可能性

**原因2: Content Security Policy (CSP) でブロックされている**

DevTools → Console に以下のようなエラーが出ている場合:

```
Refused to load the script 'https://...' because it violates the following Content Security Policy directive: "script-src ..."
```

対処法: サイトのCSP設定で Koe のドメインを `script-src` に追加してください。

**原因3: `data-project` または `data-widget` が間違っている**

ダッシュボードのウィジェット設定画面で正しいIDを再コピーしてください。IDはUUID形式（例: `a1b2c3d4-e5f6-...`）です。

**原因4: 承認済みのお客様の声がない**

ウィジェットは `status = approved`（承認済み）の声のみ表示します。ダッシュボードで少なくとも1件を承認してください。

---

### 二重に表示される

**原因: 埋め込みコードが2箇所に貼られている**

サイトのソースコードを確認し、`widget.js` を読み込んでいる `<script>` タグが1つだけであることを確認してください。

よくあるパターン:
- `<head>` と `<body>` の両方に貼っている
- テーマファイルと個別ページの両方に貼っている
- GTMとHTMLの両方で設定している

DevTools → Elements タブで `widget.js` を検索すると、何箇所にあるか確認できます。

---

### スタイルが崩れる

Koe のウィジェットは **Shadow DOM** 内にレンダリングされるため、ホストサイトのCSSとは干渉しません。

スタイルが崩れている場合:
- **ウィジェットの外側**（余白やサイズ）の問題 → 埋め込みコードを囲む親要素のCSSを確認
- **ウィジェットの内側**の問題 → ダッシュボードのウィジェット設定（テーマ、カラム数、角丸等）を確認
- **高さが足りない** → 特にSTUDIOの埋め込みボックスでは明示的な高さ指定が必要な場合があります

---

### 広告ブロッカーで表示されない

**GTM経由の場合に発生しやすい問題です。**

広告ブロッカー（Adblock, uBlock Origin等）が Google Tag Manager 自体をブロックすると、GTM経由のスクリプトは全て読み込まれません。

**対処法**: サイトに直接埋め込むことで、広告ブロッカーの影響を受けにくくなります。
→ [クイックスタート](quickstart.md) でプラットフォーム別の直接埋め込み方法を確認

---

### 更新したお客様の声が反映されない（キャッシュ）

Koe のウィジェットデータは **5分間CDNキャッシュ** されます。

- お客様の声を承認/非承認した後、最大5分で反映されます
- すぐに確認したい場合は、ブラウザの「スーパーリロード」（`Ctrl + Shift + R` / `Cmd + Shift + R`）を試してください

**サイト側のキャッシュも確認**:
- WordPress: キャッシュプラグイン（WP Super Cache等）のキャッシュをクリア
- Shopify: 管理画面からテーマキャッシュをクリア
- Vercel / Cloudflare: CDN のパージ

---

## ブラウザ DevTools での確認方法

問題の切り分けに、ブラウザの開発者ツール（DevTools）が役立ちます。

### 開き方

- Chrome / Edge: `F12` または `Ctrl + Shift + I`（Mac: `Cmd + Option + I`）
- Firefox: `F12`
- Safari: `Cmd + Option + I`（事前に「開発」メニューを有効にする必要あり）

### Console タブ

JavaScriptのエラーが表示されます。Koe関連のエラーが出ていないか確認してください。

### Network タブ

1. `F12` → Network タブを開く
2. ページを再読み込み
3. フィルタに `widget` と入力
4. 確認ポイント:
   - `widget.js` が `200 OK` で読み込まれているか？
   - `/api/widgets/xxx/data` が `200 OK` でレスポンスを返しているか？
   - レスポンスの中身に `testimonials` 配列があるか？

### Elements タブ

1. `F12` → Elements タブを開く
2. `Ctrl + F` で `data-koe` を検索
3. `<div data-koe="...">` が見つかれば、ウィジェットのコンテナは作成されている
4. その中に `#shadow-root (open)` があり、中にお客様の声のHTMLがあれば正常

---

## それでも解決しない場合

以下の情報を添えてお問い合わせください:

- お使いのプラットフォーム（STUDIO / WordPress / Shopify / Next.js / その他）
- ブラウザの種類とバージョン
- DevTools の Console に表示されているエラーメッセージ（スクリーンショット）
- DevTools の Network タブでの `widget.js` と API レスポンスの状況
