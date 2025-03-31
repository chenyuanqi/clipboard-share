"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateUniqueId } from "@/utils/helpers";
import { getClipboard } from "@/utils/storage";
import { savePasswordToServer } from "@/utils/api";

// 会话存储的键，用于授权信息
const SESSION_AUTHORIZED_KEY = 'clipboard-authorized';

// 定义授权数据的类型
interface AuthData {
  [key: string]: string;
}

export default function Home() {
  const router = useRouter();
  const [customPath, setCustomPath] = useState("");
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState("24"); // 默认24小时
  const [isCreating, setIsCreating] = useState(false);
  const [pathError, setPathError] = useState("");

  // 检查自定义路径是否已存在
  const checkPathExists = (path: string) => {
    if (!path.trim()) return false;
    
    const existingClipboard = getClipboard(path.trim());
    return !!existingClipboard;
  };

  // 处理路径输入变化
  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPath = e.target.value;
    setCustomPath(newPath);
    
    // 清除之前的错误
    if (pathError) setPathError("");
    
    // 如果有输入路径，实时检查是否已存在
    if (newPath.trim() && checkPathExists(newPath)) {
      setPathError("此路径已被使用，请更换其他路径或直接查看已有内容");
    }
  };

  const handleCreateClipboard = async () => {
    setIsCreating(true);
    try {
      // 如果指定了自定义路径，先检查是否已存在
      if (customPath.trim()) {
        const pathExists = checkPathExists(customPath);
        
        if (pathExists) {
          // 询问用户是否要访问已有剪贴板
          const confirmView = window.confirm(
            "此路径已存在剪贴板，是否查看已有内容？\n\n" +
            "点击「确定」查看已有内容\n" +
            "点击「取消」使用随机路径创建新剪贴板"
          );
          
          if (confirmView) {
            // 用户选择查看已有内容，直接跳转到该路径（不带new参数）
            router.push(`/clipboard/${customPath.trim()}`);
            return;
          } else {
            // 用户选择使用随机路径
            const randomPath = generateUniqueId();
            
            // 如果设置了密码，尝试保存到服务器和会话存储
            if (password) {
              console.log(`尝试将剪贴板 ${randomPath} 的密码保存到服务器...`);
              await savePasswordToServer(randomPath, password);
              
              // 不再保存到会话存储，要求用户输入密码
            }
            
            router.push(`/clipboard/${randomPath}?new=true${password ? '&protected=true' : ''}&exp=${expiration}`);
            return;
          }
        }
      }
      
      // 生成一个唯一ID，如果用户未指定自定义路径
      const path = customPath.trim() || generateUniqueId();
      
      // 如果设置了密码，尝试保存到服务器
      if (password) {
        console.log(`尝试将剪贴板 ${path} 的密码保存到服务器...`);
        await savePasswordToServer(path, password);
        
        // 不再保存到会话存储，要求用户输入密码
      }
      
      // 重定向到新创建的剪贴板页面，如果设置了密码，传递password参数
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
            云剪
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
                onChange={handlePathChange}
                placeholder="例如：my-notes"
                className={`w-full px-4 py-2 border ${pathError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`}
              />
              {pathError ? (
                <p className="mt-1 text-xs text-red-500">
                  {pathError}
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  如不指定，将自动生成唯一路径
                </p>
              )}
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
                <option value="12">12小时</option>
                <option value="24">24小时</option>
                <option value="48">48小时</option>
              </select>
            </div>

            <button
              onClick={handleCreateClipboard}
              disabled={isCreating}
              className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:transform active:scale-95 text-white font-medium rounded-lg transition-all duration-150 flex items-center justify-center ${isCreating ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  创建中...
                </>
              ) : (
                "创建剪贴板"
              )}
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
        <p>© {new Date().getFullYear()} 云剪 - 安全地分享您的内容</p>
      </footer>
    </div>
  );
}
