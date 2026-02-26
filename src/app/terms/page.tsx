import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約 - Koe",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-2">利用規約</h1>
        <p className="text-sm text-muted-foreground mb-8">最終更新日: 2026年2月26日</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">第1条（適用）</h2>
            <p className="leading-relaxed text-muted-foreground">
              本利用規約（以下「本規約」）は、Koe（以下「本サービス」）の利用に関する条件を定めるものです。
              ユーザーは本規約に同意の上、本サービスを利用するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第2条（サービス内容）</h2>
            <p className="leading-relaxed text-muted-foreground">
              本サービスは、テスティモニアル（顧客の声）の収集、管理、およびWebサイトへの表示を支援するSaaSプラットフォームです。
              無料プラン（Free）および有料プラン（Pro）を提供します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第3条（アカウント登録）</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>ユーザーは正確な情報を提供してアカウントを登録するものとします。</li>
              <li>アカウントの管理責任はユーザーに帰属します。</li>
              <li>1人のユーザーが複数のアカウントを作成することは禁止します。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第4条（禁止事項）</h2>
            <p className="leading-relaxed text-muted-foreground mb-2">
              ユーザーは以下の行為を行ってはなりません。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>法令または公序良俗に反する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>虚偽のテスティモニアルを作成・投稿する行為</li>
              <li>本サービスのリバースエンジニアリング、不正アクセス</li>
              <li>APIの不正利用、過剰なリクエストによるサービス負荷</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第5条（有料プラン・決済）</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>有料プランの決済はStripe, Inc.を通じて処理されます。</li>
              <li>サブスクリプションは月額自動更新です。</li>
              <li>解約はいつでも可能で、解約後は現在の請求期間の終了まで利用できます。</li>
              <li>返金は原則として行いません。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第6条（知的財産権）</h2>
            <p className="leading-relaxed text-muted-foreground">
              本サービスに関する知的財産権は運営者に帰属します。
              ユーザーが本サービスを通じて投稿したコンテンツの権利はユーザーに帰属しますが、
              本サービスの提供に必要な範囲での利用を許諾するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第7条（免責事項）</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>本サービスは「現状有姿」で提供され、特定の目的への適合性を保証しません。</li>
              <li>サービスの中断、データの損失について、運営者は責任を負いません。</li>
              <li>ユーザー間またはユーザーと第三者間のトラブルについて、運営者は責任を負いません。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第8条（サービスの変更・終了）</h2>
            <p className="leading-relaxed text-muted-foreground">
              運営者は、事前の通知なくサービス内容の変更、一時停止、または終了を行うことができるものとします。
              重要な変更の場合は、合理的な期間内にメールまたはサービス内で通知します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第9条（規約の変更）</h2>
            <p className="leading-relaxed text-muted-foreground">
              運営者は本規約を随時変更できるものとします。
              変更後も本サービスを継続して利用した場合、変更後の規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第10条（準拠法・管轄裁判所）</h2>
            <p className="leading-relaxed text-muted-foreground">
              本規約は日本法に準拠するものとし、本サービスに関する紛争については
              東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">運営者情報</h2>
            <ul className="list-none space-y-1 text-muted-foreground">
              <li>運営者: 前川蒼</li>
              <li>メール: ao.maekawa@gmail.com</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
