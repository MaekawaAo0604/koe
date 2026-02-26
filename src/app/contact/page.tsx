import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "お問い合わせ - Koe",
  robots: { index: true, follow: true },
};

export default function ContactPage() {
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
        <h1 className="text-3xl font-bold mb-2">お問い合わせ</h1>
        <p className="text-muted-foreground mb-8">
          ご質問・ご要望・不具合報告など、お気軽にお問い合わせください。
        </p>

        <ContactForm />

        <div className="mt-8 space-y-2 text-sm text-muted-foreground">
          <p>通常24時間以内に返信いたします。</p>
          <p>返信が届かない場合は、迷惑メールフォルダもご確認ください。</p>
          <p>
            緊急時は{" "}
            <a
              href="mailto:support@getkoe.jp"
              className="underline hover:text-foreground"
            >
              support@getkoe.jp
            </a>
            {" "}へ直接ご連絡ください。
          </p>
        </div>
      </main>
    </div>
  );
}
