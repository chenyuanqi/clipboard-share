import type { Metadata, Viewport } from "next";
// 暂时注释掉Google Fonts的导入
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import ThemeScript from "@/components/ThemeScript";

// 暂时注释掉Google Fonts的配置
/*
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
*/

// 这是在服务器组件中导出的元数据
export const metadata: Metadata = {
  title: "云剪 | 安全简单的文本共享工具",
  description: "安全地分享文本信息，支持密码保护和临时链接，无需注册即可使用。",
  keywords: "云剪, 文本分享, 临时链接, 加密分享",
  authors: [{ name: "Clipboard Share Team" }],
};

// Next.js 15中的viewport配置需要单独导出
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

// 根布局是服务器组件
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body 
        // 暂时使用系统默认字体替代Google Fonts
        // className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        className="antialiased min-h-screen font-sans"
        suppressHydrationWarning
      >
        {/* 使用客户端组件来处理需要useEffect的逻辑 */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
