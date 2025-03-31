"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateUniqueId } from "@/utils/helpers";

export default function Home() {
  const router = useRouter();
  const [customPath, setCustomPath] = useState("");
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState("1"); // 默认1小时
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateClipboard = async () => {
    setIsCreating(true);
    try {
      // 生成一个唯一ID，如果用户未指定自定义路径
      const path = customPath.trim() || generateUniqueId();
      
      // 重定向到新创建的剪贴板页面
      router.push(`/clipboard/${path}?new=true${password ? '&protected=true' : ''}&exp=${expiration}`);
    } catch (error) {
      console.error("创建剪贴板时出错:", error);
      alert("创建剪贴板失败，请重试");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="w-full p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            剪贴板共享
          </h1>
          <nav className="hidden sm:flex space-x-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">
              首页
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">
              关于
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="max-w-md w-full mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
            创建新的剪贴板
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="customPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                自定义路径（可选）
              </label>
              <input
                type="text"
                id="customPath"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="例如：my-notes"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                如不指定，将自动生成唯一路径
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                密码保护（可选）
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="设置访问密码"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                为保障安全，密码仅会保存在您的设备上
              </p>
            </div>

            <div>
              <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                有效期
              </label>
              <select
                id="expiration"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="1">1小时</option>
                <option value="3">3小时</option>
                <option value="6">6小时</option>
                <option value="12">12小时</option>
                <option value="24">24小时</option>
              </select>
            </div>

            <button
              onClick={handleCreateClipboard}
              disabled={isCreating}
              className={`w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-sm ${
                isCreating ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isCreating ? "创建中..." : "创建剪贴板"}
            </button>
          </div>
        </div>

        <div className="mt-10 max-w-2xl text-center">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            安全、简单的文本共享方式
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h4 className="font-medium text-lg mb-2 text-gray-800 dark:text-white">密码保护</h4>
              <p className="text-gray-600 dark:text-gray-300">使用密码加密您的内容，仅分享给信任的人</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h4 className="font-medium text-lg mb-2 text-gray-800 dark:text-white">临时链接</h4>
              <p className="text-gray-600 dark:text-gray-300">所有内容在到期后自动删除，保护您的隐私</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h4 className="font-medium text-lg mb-2 text-gray-800 dark:text-white">多设备支持</h4>
              <p className="text-gray-600 dark:text-gray-300">无论电脑还是手机，都能轻松访问和编辑</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 text-center text-gray-600 dark:text-gray-400">
        <p>© {new Date().getFullYear()} 剪贴板共享 - 安全地分享您的内容</p>
      </footer>
    </div>
  );
}
