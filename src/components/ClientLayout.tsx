'use client';

import { ReactNode, useEffect } from 'react';
import CleanupScript from "@/components/CleanupScript";
import ThemeProvider from "@/components/ThemeProvider";

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // 添加定期清理功能
  useEffect(() => {
    // 首次加载时执行一次清理
    const cleanupExpiredClipboards = async () => {
      try {
        // 使用force=true参数确保彻底清理
        const response = await fetch('/api/cleanup?force=true', { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.cleanedCount > 0) {
            console.log(`清理了 ${data.cleanedCount} 个过期剪贴板`);
          }
        }
      } catch (error) {
        console.error('清理过期剪贴板失败:', error);
      }
    };

    // 立即执行一次
    cleanupExpiredClipboards();

    // 设置定时器，每5分钟执行一次清理
    const cleanupInterval = setInterval(cleanupExpiredClipboards, 5 * 60 * 1000);

    // 组件卸载时清除定时器
    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <ThemeProvider>
      <CleanupScript />
      {children}
    </ThemeProvider>
  );
} 