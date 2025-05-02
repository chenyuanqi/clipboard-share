'use client';

import { ReactNode, useEffect, useState } from 'react';
import CleanupScript from "@/components/CleanupScript";
import ThemeProvider from "@/components/ThemeProvider";

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [mounted, setMounted] = useState(false);

  // 添加定期清理功能
  useEffect(() => {
    // 确保组件已挂载，避免服务器渲染不匹配
    setMounted(true);

    // 延迟执行清理，确保不影响初始渲染
    const timer = setTimeout(async () => {
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
    }, 2000); // 延迟2秒执行清理，避免影响页面加载性能

    // 每5分钟执行一次清理，为避免与CleanupScript冲突，这里可以去除
    // 组件卸载时清除定时器
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      {mounted && <CleanupScript />}
      {children}
    </ThemeProvider>
  );
} 