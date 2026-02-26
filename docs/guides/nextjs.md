# Next.js で Koe を埋め込む

Next.js では `next/script` コンポーネントを使うのが公式推奨の方法です。App Router と Pages Router の両方に対応しています。

---

## App Router（推奨）

### `app/layout.tsx` に追加

```tsx
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Script
          src="https://あなたのURL/widget.js"
          strategy="afterInteractive"
          data-project="あなたのプロジェクトID"
          data-widget="あなたのウィジェットID"
        />
      </body>
    </html>
  );
}
```

**ポイント**:
- `strategy="afterInteractive"` でページの読み込み完了後にスクリプトが実行されます（パフォーマンス最適化）
- `data-project` と `data-widget` はKoeのダッシュボードで確認できるIDに置き換えてください

### 特定のページにだけ表示したい場合

`app/layout.tsx` ではなく、対象ページの `page.tsx` に直接記述します:

```tsx
import Script from "next/script";

export default function TestimonialsPage() {
  return (
    <div>
      <h1>お客様の声</h1>
      <Script
        src="https://あなたのURL/widget.js"
        strategy="afterInteractive"
        data-project="あなたのプロジェクトID"
        data-widget="あなたのウィジェットID"
      />
    </div>
  );
}
```

---

## Pages Router

### `pages/_app.tsx` に追加

```tsx
import type { AppProps } from "next/app";
import Script from "next/script";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Script
        src="https://あなたのURL/widget.js"
        strategy="afterInteractive"
        data-project="あなたのプロジェクトID"
        data-widget="あなたのウィジェットID"
      />
    </>
  );
}
```

### 特定のページにだけ表示したい場合

対象ページのコンポーネントに直接記述します:

```tsx
import Script from "next/script";

export default function AboutPage() {
  return (
    <div>
      <h1>お客様の声</h1>
      <Script
        src="https://あなたのURL/widget.js"
        strategy="afterInteractive"
        data-project="あなたのプロジェクトID"
        data-widget="あなたのウィジェットID"
      />
    </div>
  );
}
```

---

## strategy の選び方

| strategy | 読み込みタイミング | 使い分け |
|----------|-------------------|---------|
| `afterInteractive` | ページの初期読み込み直後 | **通常はこれを使う**（おすすめ） |
| `lazyOnload` | ブラウザが暇なとき | ファーストビューに表示しない場合 |
| `beforeInteractive` | ページ描画前 | Koeでは不要（パフォーマンスに影響する） |

---

## 注意事項

### Vercel / セルフホスト

どちらのホスティング環境でも動作します。特別な設定は不要です。

### Content Security Policy (CSP)

`next.config.js` でCSPヘッダーを設定している場合は、Koe のドメインを `script-src` に追加してください:

```js
// next.config.js
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "script-src 'self' https://あなたのKoeドメイン;",
  },
];
```

### TypeScript の型エラー

`data-project` や `data-widget` は HTML のカスタムデータ属性（`data-*`）なので、TypeScript の型エラーは発生しません。

その他の問題は [トラブルシューティング](troubleshooting.md) を参照してください。
