import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "云剪 | 安全、简单的文本共享工具",
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 定期清理脚本 - 每30分钟检查一次过期的剪贴板
              (function setupCleanupInterval() {
                // 防止在服务器端执行
                if (typeof window === 'undefined') return;
                
                // 清理函数
                async function cleanupExpiredClipboards() {
                  try {
                    console.log('[自动清理] 开始检查过期剪贴板...');
                    const response = await fetch('/api/cleanup', {
                      method: 'GET',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      console.log('[自动清理] 清理完成:', result);
                    } else {
                      console.error('[自动清理] 清理API调用失败');
                    }
                  } catch (error) {
                    console.error('[自动清理] 出错:', error);
                  }
                }
                
                // 页面加载时立即执行一次清理
                cleanupExpiredClipboards();
                
                // 设置定时器，每30分钟执行一次
                const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30分钟
                setInterval(cleanupExpiredClipboards, CLEANUP_INTERVAL);
                
                console.log('[自动清理] 已设置定时清理任务（每30分钟）');
              })();
            `
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
