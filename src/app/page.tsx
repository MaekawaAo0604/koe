import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Star, MessageSquare, BarChart3, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: {
    absolute: "Koe - テスティモニアル収集・管理SaaS",
  },
  description:
    "フォームURL共有→自動収集→scriptタグ1行埋め込み。フリーランス・個人開発者のための手軽なテスティモニアルSaaS。無料で始められます。",
  openGraph: {
    title: "Koe - テスティモニアル収集・管理SaaS",
    description:
      "フォームURL共有→自動収集→scriptタグ1行埋め込み。フリーランス・個人開発者のための手軽なテスティモニアルSaaS。無料で始められます。",
  },
};
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// デモ用テスティモニアルデータ（ドッグフーディング）
const DEMO_TESTIMONIALS = [
  {
    id: "1",
    author_name: "田中 太郎",
    author_title: "フリーランスデザイナー",
    author_company: "株式会社クリエイト",
    rating: 5,
    content:
      "フォームURLを共有するだけで簡単に声を集められます。scriptタグ1行で自分のサイトに埋め込めるのが特に便利です！",
  },
  {
    id: "2",
    author_name: "鈴木 花子",
    author_title: "個人開発者",
    author_company: null,
    rating: 5,
    content:
      "Koeを使い始めてから顧客の声の管理が劇的に楽になりました。承認フローも直感的で使いやすいです。",
  },
  {
    id: "3",
    author_name: "佐藤 一郎",
    author_title: "プロダクトマネージャー",
    author_company: "スタートアップ合同会社",
    rating: 5,
    content:
      "デザインのカスタマイズができて、ブランドに合ったウィジェットを作れるのが素晴らしい。Proプランは価格以上の価値があります。",
  },
  {
    id: "4",
    author_name: "山田 美咲",
    author_title: "Webディレクター",
    author_company: "デジタルエージェンシー",
    rating: 5,
    content:
      "Wall of Loveページをそのまま共有できるのが便利です。お客様への信頼構築に役立っています。",
  },
  {
    id: "5",
    author_name: "中村 健太",
    author_title: "コーチ・コンサルタント",
    author_company: null,
    rating: 4,
    content:
      "無料プランでも十分な機能があります。テスティモニアルを集めるハードルが下がって、積極的に活用できています。",
  },
  {
    id: "6",
    author_name: "小林 奈々",
    author_title: "ECサイト運営者",
    author_company: "ライフスタイルショップ",
    rating: 5,
    content:
      "設定が簡単なのに見栄えが良くて驚きました。お客様の声をサイトに掲載してから問い合わせが増えた気がします。",
  },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: "フォームURL共有で自動収集",
    description:
      "専用の収集フォームURLをお客様に共有するだけ。名前・評価・感想を簡単に入力でき、自動でダッシュボードに蓄積されます。",
  },
  {
    icon: BarChart3,
    title: "承認・管理・タグ付け",
    description:
      "集まった声を承認・非承認で管理。タグや評価でフィルタリングして、活用したいテスティモニアルを素早く見つけられます。",
  },
  {
    icon: Globe,
    title: "scriptタグ1行で埋め込み",
    description:
      "ウィジェットコードをコピーして自分のサイトに貼るだけ。Shadow DOMでスタイル干渉なし、デザインもカスタマイズ可能。",
  },
];

interface PricingFeature {
  text: string;
  free: boolean;
  pro: boolean;
}

const PRICING_FEATURES: PricingFeature[] = [
  { text: "テスティモニアル収集フォーム", free: true, pro: true },
  { text: "テスティモニアル管理・承認", free: true, pro: true },
  { text: "Wall of Love ウィジェット", free: true, pro: true },
  { text: "Wall of Love 公開ページ", free: true, pro: true },
  { text: "プロジェクト数", free: false, pro: true },
  { text: "テスティモニアル件数", free: false, pro: true },
  { text: "全ウィジェットタイプ（カルーセル・リスト）", free: false, pro: true },
  { text: "Powered by Koe バッジ非表示", free: false, pro: true },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating}点`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-4 h-4",
            star <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ナビゲーション */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between h-16">
            <div className="font-bold text-xl">Koe</div>
            <nav className="flex items-center gap-4">
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                機能
              </Link>
              <Link
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                料金
              </Link>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">ログイン</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">無料で始める</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {/* ヒーローセクション */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto px-4 max-w-6xl text-center">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
              テスティモニアル収集・管理SaaS
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              顧客の声を集めて
              <br />
              <span className="text-primary">売上に変える</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              フォームURL共有 → 自動収集 → scriptタグ1行埋め込み。
              <br className="hidden sm:block" />
              フリーランス・個人開発者のための、手軽なテスティモニアルSaaS。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="w-full sm:w-auto text-base px-8" asChild>
                <Link href="/register" data-testid="hero-cta">
                  無料で始める
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" asChild>
                <Link href="#demo">デモを見る</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              クレジットカード不要・無料プランあり
            </p>
          </div>
        </section>

        {/* 機能紹介セクション */}
        <section id="features" className="py-20 bg-background">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                3ステップで完結
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                複雑な設定は不要。すぐに顧客の声を集めて、自分のサイトに表示できます。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {FEATURES.map((feature, index) => (
                <div
                  key={feature.title}
                  className="flex flex-col items-center text-center p-6 rounded-xl border bg-card hover:shadow-md transition-shadow"
                  data-testid={`feature-card-${index}`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-semibold text-primary mb-2">
                    STEP {index + 1}
                  </div>
                  <h3 className="text-lg font-bold mb-3">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* デモ Wall of Love セクション */}
        <section id="demo" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                デモ Wall of Love
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Koeを使っているユーザーの声
              </h2>
              <p className="text-muted-foreground text-lg">
                これ自体がKoeで収集・表示しています
              </p>
            </div>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {DEMO_TESTIMONIALS.map((testimonial) => (
                <Card
                  key={testimonial.id}
                  className="break-inside-avoid hover:shadow-md transition-shadow"
                  data-testid={`testimonial-card-${testimonial.id}`}
                >
                  <CardContent className="pt-6">
                    <StarRating rating={testimonial.rating} />
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {testimonial.author_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{testimonial.author_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {testimonial.author_title}
                          {testimonial.author_company && ` · ${testimonial.author_company}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 料金プランセクション */}
        <section id="pricing" className="py-20 bg-background">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                シンプルな料金プラン
              </h2>
              <p className="text-muted-foreground text-lg">
                まず無料で始めて、必要になったらアップグレード
              </p>
            </div>

            {/* プランカード */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-12">
              {/* Freeプラン */}
              <div
                className="rounded-xl border bg-card p-8 flex flex-col"
                data-testid="pricing-free"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold">Free</h3>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">¥0</span>
                    <span className="text-muted-foreground ml-1">/ 月</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    個人・小規模なテスティモニアル収集に
                  </p>
                </div>
                <Button variant="outline" className="w-full mb-6" asChild>
                  <Link href="/register">無料で始める</Link>
                </Button>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                    <span>1プロジェクト</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                    <span>10件のテスティモニアル / プロジェクト</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                    <span>Wall of Love ウィジェット</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                    <span>Wall of Love 公開ページ</span>
                  </li>
                </ul>
              </div>

              {/* Proプラン */}
              <div
                className="rounded-xl border-2 border-primary bg-card p-8 flex flex-col relative shadow-md"
                data-testid="pricing-pro"
              >
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4">
                  おすすめ
                </Badge>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold">Pro</h3>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">¥980</span>
                    <span className="text-muted-foreground ml-1">/ 月</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    プロフェッショナルな活用に
                  </p>
                </div>
                <Button className="w-full mb-6" asChild>
                  <Link href="/register" data-testid="pricing-pro-cta">
                    無料で始める
                  </Link>
                </Button>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                    <span>プロジェクト無制限</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                    <span>テスティモニアル無制限</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                    <span>全ウィジェットタイプ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                    <span>Powered by Koe バッジ非表示</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                    <span>カスタムブランドカラー</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 機能比較表 */}
            <div className="max-w-3xl mx-auto" data-testid="feature-comparison-table">
              <h3 className="text-lg font-semibold text-center mb-6">機能比較</h3>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-6 py-3 font-medium">機能</th>
                      <th className="text-center px-6 py-3 font-medium w-24">Free</th>
                      <th className="text-center px-6 py-3 font-medium w-24 text-primary">Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRICING_FEATURES.map((feature, index) => (
                      <tr
                        key={feature.text}
                        className={cn(
                          "border-t",
                          index % 2 === 0 ? "bg-background" : "bg-muted/20"
                        )}
                      >
                        <td className="px-6 py-3 text-foreground">{feature.text}</td>
                        <td className="px-6 py-3 text-center">
                          {feature.free ? (
                            <Check
                              className="w-4 h-4 text-green-500 mx-auto"
                              aria-label="利用可能"
                            />
                          ) : (
                            <X
                              className="w-4 h-4 text-muted-foreground mx-auto"
                              aria-label="利用不可"
                            />
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {feature.pro ? (
                            <Check
                              className="w-4 h-4 text-green-500 mx-auto"
                              aria-label="利用可能"
                            />
                          ) : (
                            <X
                              className="w-4 h-4 text-muted-foreground mx-auto"
                              aria-label="利用不可"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ボトム CTA セクション */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 max-w-6xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              今すぐ顧客の声を集めよう
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
              無料で始められます。クレジットカード不要。
              <br />
              数分でセットアップ完了。
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="text-base px-8"
              asChild
            >
              <Link href="/register" data-testid="bottom-cta">
                無料で始める
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t py-8 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="font-bold text-lg">Koe</div>
            <p className="text-sm text-muted-foreground">
              © 2025 Koe. All rights reserved.
            </p>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                利用規約
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                プライバシーポリシー
              </Link>
              <Link href="/login" className="hover:text-foreground transition-colors">
                ログイン
              </Link>
              <Link href="/register" className="hover:text-foreground transition-colors">
                新規登録
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
