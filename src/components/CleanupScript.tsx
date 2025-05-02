"use client";

import { useEffect, useState } from 'react';

/**
 * 清理脚本组件
 * 处理定期清理过期剪贴板的任务
 * 仅在客户端环境下执行
 */
export default function CleanupScript() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 标记已经到了客户端环境
    setIsClient(true);

    // 清理函数
    async function cleanupExpiredClipboards() {
      try {
        console.log('[自动清理] 开始检查过期剪贴板...');
        const response = await fetch('/api/cleanup', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // 添加随机参数避免缓存
          cache: 'no-store'
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
    
    // 使用setTimeout延迟第一次执行，避免与ClientLayout中的清理冲突
    const initialTimer = setTimeout(() => {
      // 页面加载后延迟执行一次清理
      cleanupExpiredClipboards();
      
      // 设置定时器，每30分钟执行一次
      const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30分钟
      const intervalId = setInterval(cleanupExpiredClipboards, CLEANUP_INTERVAL);
      
      console.log('[自动清理] 已设置定时清理任务（每30分钟）');
      
      // 保存intervalId，以便在组件卸载时清除
      return () => {
        clearInterval(intervalId);
      };
    }, 5000); // 5秒后开始执行，确保与ClientLayout中的清理错开
    
    // 清理函数
    return () => {
      clearTimeout(initialTimer);
    };
  }, []); // 空依赖数组确保只在组件挂载时执行一次
  
  // 此组件不渲染任何UI内容
  return null;
} 