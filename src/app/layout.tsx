import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CleanupScript from "@/components/CleanupScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "云剪 | 安全简单的文本共享工具",
  description: "安全地分享文本信息，支持密码保护和临时链接，无需注册即可使用。",
  keywords: "云剪, 文本分享, 临时链接, 加密分享",
  authors: [{ name: "Clipboard Share Team" }],
  viewport: "width=device-width, initial-scale=1.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head />
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <CleanupScript />
        {children}
      </body>
    </html>
  );
}
