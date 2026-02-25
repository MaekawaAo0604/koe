import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const SITE_DESCRIPTION =
  "フォームURL共有→自動収集→scriptタグ1行埋め込み。フリーランス・個人開発者のための手軽なテスティモニアルSaaS。顧客の声を集めて売上に変える。";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Koe - テスティモニアル収集・管理SaaS",
    template: "%s | Koe",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "テスティモニアル",
    "お客様の声",
    "SaaS",
    "レビュー収集",
    "ウィジェット",
    "Wall of Love",
    "フリーランス",
    "個人開発者",
  ],
  authors: [{ name: "Koe" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: APP_URL,
    siteName: "Koe",
    title: "Koe - テスティモニアル収集・管理SaaS",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Koe - テスティモニアル収集・管理SaaS",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
