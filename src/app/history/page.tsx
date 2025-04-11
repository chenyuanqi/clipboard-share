"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getClipboardHistory, removeFromHistory, clearClipboardHistory, ClipboardHistoryItem } from "@/utils/storage";
import { formatChinaTime } from "@/utils/helpers";

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<ClipboardHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 加载历史记录
  useEffect(() => {
    try {
      const history = getClipboardHistory();
      setHistoryItems(history);
    } catch (error) {
      console.error("加载历史记录失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 处理删除单个历史记录
  const handleRemoveItem = (id: string) => {
    if (confirm(`确定要从历史记录中删除"${id}"吗？`)) {
      removeFromHistory(id);
      setHistoryItems(historyItems.filter(item => item.id !== id));
    }
  };

  // 清空所有历史记录
  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  // 确认清空
  const confirmClearAll = () => {
    clearClipboardHistory();
    setHistoryItems([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="w-full p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-800 dark:text-white">
            云剪
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">
              首页
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">
              关于
            </Link>
            <Link 
              href="/history" 
              className="ml-1 w-9 h-9 flex items-center justify-center text-blue-600 dark:text-blue-400 rounded-full bg-blue-50 dark:bg-blue-900/30"
              aria-current="page"
              title="浏览历史"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              浏览历史
            </h1>
            {historyItems.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium rounded-lg border border-red-200 hover:border-red-300 dark:border-red-900 dark:hover:border-red-800 transition-colors"
              >
                清空历史
              </button>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="mt-4 text-xl font-medium text-gray-700 dark:text-gray-300">
                暂无浏览历史
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                访问剪贴板内容后，会自动记录到这里
              </p>
              <Link
                href="/"
                className="mt-6 inline-block px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                创建新剪贴板
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {historyItems.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/clipboard/${item.id}`}
                        className="block"
                      >
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white truncate mb-1">
                          {item.title || `剪贴板 ${item.id}`}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          路径: <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{item.id}</span>
                          {item.isProtected && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                              <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              密码保护
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {item.content || '(无内容)'}
                        </p>
                      </Link>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4">
                        <span>最后访问: {formatChinaTime(item.visitedAt)}</span>
                        <span>创建于: {formatChinaTime(item.createdAt)}</span>
                        <span>过期时间: {formatChinaTime(item.expiresAt)}</span>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-4 flex space-x-2">
                      <Link
                        href={`/clipboard/${item.id}`}
                        className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-700 text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        查看
                      </Link>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <footer className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 text-center text-gray-600 dark:text-gray-400">
        <p>© {new Date().getFullYear()} 云剪 - 安全地分享您的内容</p>
      </footer>
      
      {/* 清空确认对话框 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">确认清空历史记录</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              此操作将清空所有浏览历史记录，且不可恢复。确定要继续吗？
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmClearAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 