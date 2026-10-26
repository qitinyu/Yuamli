import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SITE_ICON, SITE_VERSION } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yuamli - 轻量留言系统",
  description: `Yuamli v${SITE_VERSION} 轻量留言系统，支持 GitHub / GitCode / 邮箱验证码登录、Markdown 语法、邮件通知与后台管理`,
  keywords: ["Yuamli", "comment system", "guestbook", "留言系统"],
  authors: [{ name: "Yuamli" }],
  icons: {
    icon: [{ url: SITE_ICON, type: "image/webp" }],
    shortcut: [{ url: SITE_ICON, type: "image/webp" }],
    apple: [{ url: SITE_ICON }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
