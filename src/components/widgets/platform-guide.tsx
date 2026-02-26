"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <div className="text-sm text-muted-foreground pt-0.5">{children}</div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-muted rounded-md p-3 overflow-x-auto">
      <code className="text-xs font-mono break-all text-foreground whitespace-pre-wrap">
        {children}
      </code>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950 p-3 text-xs text-yellow-800 dark:text-yellow-200">
      <span className="font-bold">注意: </span>
      {children}
    </div>
  );
}

function HtmlGuide() {
  return (
    <div className="space-y-3">
      <Step n={1}>
        上の埋め込みコードをコピーします。
      </Step>
      <Step n={2}>
        お客様の声を表示したいページの HTML を開き、
        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{"</body>"}</code>{" "}
        の直前に貼り付けます。
      </Step>
      <Step n={3}>
        ページを開いて、お客様の声が表示されていれば完了です。
      </Step>
    </div>
  );
}

function WordPressGuide() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">セルフホスト WordPress / WordPress.com ビジネスプラン以上</p>
      <Step n={1}>
        WordPress 管理画面で、表示したいページの「編集」を開きます。
      </Step>
      <Step n={2}>
        ブロックエディタの「+」ボタンから「カスタム HTML」ブロックを追加します。
      </Step>
      <Step n={3}>
        Koe の埋め込みコードを貼り付けて「更新」をクリックします。
      </Step>
      <Warning>
        WordPress.com の無料・パーソナル・プレミアムプランでは{" "}
        <code className="text-xs bg-yellow-100 dark:bg-yellow-900 px-1 rounded font-mono">{"<script>"}</code>{" "}
        タグがセキュリティ上の理由で除去されます。ビジネスプラン以上にアップグレードするか、
        Wall of Love ページの URL をサイトに掲載する方法をご利用ください。
      </Warning>
    </div>
  );
}

function ShopifyGuide() {
  return (
    <div className="space-y-3">
      <Step n={1}>
        Shopify 管理画面 → 「オンラインストア」→「テーマ」→「コードを編集」を開きます。
      </Step>
      <Step n={2}>
        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">layout/theme.liquid</code>{" "}
        ファイルを開きます。
      </Step>
      <Step n={3}>
        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{"</head>"}</code>{" "}
        の直前に Koe の埋め込みコードを貼り付けて保存します。
      </Step>
      <Warning>
        テーマを変更すると埋め込みコードは引き継がれません。テーマ変更後は再度設置してください。
      </Warning>
    </div>
  );
}

function StudioGuide() {
  return (
    <div className="space-y-3">
      <Step n={1}>
        STUDIO エディタで、お客様の声を表示したいページを開きます。
      </Step>
      <Step n={2}>
        左パネルの「追加」→「ボックス」→「埋め込み（Embed）」を配置します。
      </Step>
      <Step n={3}>
        埋め込みボックスを選択 → 右パネルの「埋め込み」→ コードエディタに Koe の埋め込みコードを貼り付けます。
      </Step>
      <Step n={4}>
        プレビューで表示を確認し、「公開」をクリックします。
      </Step>
      <Warning>
        表示されない場合は、埋め込みボックスの高さを明示的に指定してください（例: 500px）。
        STUDIO では外部コードの動作がサポート対象外となる場合があります。
      </Warning>
    </div>
  );
}

function NextjsGuide() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">App Router（app/layout.tsx）</p>
      <CodeBlock>{`import Script from "next/script";

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
          src="あなたのURL/widget.js"
          strategy="afterInteractive"
          data-project="プロジェクトID"
          data-widget="ウィジェットID"
        />
      </body>
    </html>
  );
}`}</CodeBlock>
      <p className="text-xs text-muted-foreground">
        <code className="bg-muted px-1 py-0.5 rounded font-mono">src</code> と{" "}
        <code className="bg-muted px-1 py-0.5 rounded font-mono">data-*</code>{" "}
        属性は上の埋め込みコードの値に置き換えてください。
        Pages Router の場合は{" "}
        <code className="bg-muted px-1 py-0.5 rounded font-mono">pages/_app.tsx</code>{" "}
        に同様に追加します。
      </p>
    </div>
  );
}

function GtmGuide() {
  return (
    <div className="space-y-3">
      <Step n={1}>
        Google Tag Manager → 「タグ」→「新規」→ タグタイプ「カスタム HTML」を選択します。
      </Step>
      <Step n={2}>
        HTML 欄に Koe の埋め込みコードを貼り付けます。
      </Step>
      <Step n={3}>
        トリガーを「All Pages」に設定し、保存 → プレビュー → 公開します。
      </Step>
      <Warning>
        広告ブロッカー（Adblock 等）が GTM 自体をブロックすると、Koe も表示されません。
        表示の確実性を求める場合は、サイトへの直接貼り付けを推奨します。
      </Warning>
    </div>
  );
}

export function PlatformGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>埋め込みガイド</CardTitle>
        <CardDescription>
          お使いのプラットフォームを選んでください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="html">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="html" className="text-xs">HTML</TabsTrigger>
            <TabsTrigger value="wordpress" className="text-xs">WordPress</TabsTrigger>
            <TabsTrigger value="shopify" className="text-xs">Shopify</TabsTrigger>
            <TabsTrigger value="studio" className="text-xs">STUDIO</TabsTrigger>
            <TabsTrigger value="nextjs" className="text-xs">Next.js</TabsTrigger>
            <TabsTrigger value="gtm" className="text-xs">GTM</TabsTrigger>
          </TabsList>
          <TabsContent value="html"><HtmlGuide /></TabsContent>
          <TabsContent value="wordpress"><WordPressGuide /></TabsContent>
          <TabsContent value="shopify"><ShopifyGuide /></TabsContent>
          <TabsContent value="studio"><StudioGuide /></TabsContent>
          <TabsContent value="nextjs"><NextjsGuide /></TabsContent>
          <TabsContent value="gtm"><GtmGuide /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
