import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー - Koe",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 max-w-3xl py-4">
          <Link href="/" className="font-bold text-xl hover:opacity-80 transition-opacity">
            Koe
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 max-w-3xl py-12">
        <h1 className="text-3xl font-bold mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-muted-foreground mb-8">最終更新日: 2026年2月26日</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. はじめに</h2>
            <p className="leading-relaxed text-muted-foreground">
              Koe（以下「本サービス」）は、ユーザーのプライバシーを尊重し、
              個人情報の保護に努めます。本ポリシーは、本サービスにおける個人情報の取り扱いについて説明します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 収集する情報</h2>
            <h3 className="text-base font-medium mb-2 mt-4">2.1 アカウント情報</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>メールアドレス</li>
              <li>氏名（Google認証を通じて提供された場合）</li>
              <li>パスワード（ハッシュ化して保存）</li>
            </ul>

            <h3 className="text-base font-medium mb-2 mt-4">2.2 テスティモニアル投稿者の情報</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>氏名</li>
              <li>メールアドレス（任意）</li>
              <li>役職・会社名（任意）</li>
              <li>評価・感想テキスト</li>
            </ul>

            <h3 className="text-base font-medium mb-2 mt-4">2.3 決済情報</h3>
            <p className="leading-relaxed text-muted-foreground">
              クレジットカード情報はStripe, Inc.が直接処理し、本サービスのサーバーには保存されません。
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">2.4 自動収集情報</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>IPアドレス（レートリミット目的）</li>
              <li>アクセスログ（サーバーログ）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 情報の利用目的</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>本サービスの提供・運営・改善</li>
              <li>ユーザー認証およびアカウント管理</li>
              <li>有料プランの決済処理</li>
              <li>不正利用の防止（レートリミット等）</li>
              <li>サービスに関する重要なお知らせの送信</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 第三者への情報提供</h2>
            <p className="leading-relaxed text-muted-foreground mb-3">
              本サービスは以下の第三者サービスを利用しており、それぞれのプライバシーポリシーに基づき情報が処理されます。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Supabase</strong> — 認証、データベース、ストレージ</li>
              <li><strong>Stripe</strong> — 決済処理</li>
              <li><strong>Vercel</strong> — ホスティング、サーバーレス実行</li>
              <li><strong>Google</strong> — OAuth認証（Google認証利用時）</li>
              <li><strong>Upstash</strong> — レートリミット処理</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground mt-3">
              上記以外の第三者に対して、法令に基づく場合を除き、ユーザーの同意なく個人情報を提供することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cookie</h2>
            <p className="leading-relaxed text-muted-foreground">
              本サービスはセッション管理のためにCookieを使用します。
              これらは認証状態の維持に必要であり、トラッキング目的では使用しません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. データの保持</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>アカウント情報は、アカウント削除まで保持します。</li>
              <li>テスティモニアルデータは、プロジェクトオーナーが削除するまで保持します。</li>
              <li>決済関連の情報は、法令に基づく保存義務期間中保持します。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. データのセキュリティ</h2>
            <p className="leading-relaxed text-muted-foreground">
              本サービスは、SSL/TLS暗号化通信、Row Level Security（RLS）によるデータアクセス制御、
              パスワードのハッシュ化など、適切なセキュリティ対策を講じています。
              ただし、インターネット上の通信において完全なセキュリティを保証するものではありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. ユーザーの権利</h2>
            <p className="leading-relaxed text-muted-foreground">ユーザーは以下の権利を有します。</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>自身の個人情報へのアクセスおよび訂正</li>
              <li>アカウントの削除（データの消去を含む）</li>
              <li>個人情報の利用停止の請求</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. ポリシーの変更</h2>
            <p className="leading-relaxed text-muted-foreground">
              本ポリシーは随時変更されることがあります。
              重要な変更がある場合は、本サービス上で通知します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. お問い合わせ</h2>
            <p className="leading-relaxed text-muted-foreground">
              プライバシーに関するお問い合わせは、本サービスのお問い合わせフォームまたは
              運営者のメールアドレスまでご連絡ください。
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
