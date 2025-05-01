"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateUniqueId } from "@/utils/helpers";
import { getClipboard, saveClipboardPassword, addToHistory } from "@/utils/storage";
import { savePasswordToServer } from "@/utils/api";
import Dialog from "@/components/Dialog";
import ThemeSwitch from "@/components/ThemeSwitch";

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
  
  // 对话框状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState({
    path: "",
    action: ""
  });

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

  // 处理查看已有剪贴板的操作
  const handleViewExisting = () => {
    router.push(`/clipboard/${dialogData.path.trim()}`);
  };

  // 处理创建随机路径剪贴板的操作
  const handleCreateWithRandomPath = async () => {
    const randomPath = generateUniqueId();
    await createClipboardWithPath(randomPath);
  };

  // 使用指定路径创建剪贴板
  const createClipboardWithPath = async (path: string) => {
    try {
      // 如果设置了密码，尝试保存到服务器和本地
      if (password) {
        console.log(`准备创建有密码保护的剪贴板：路径=${path}, 密码=${password?'已设置':'未设置'}`);
        await savePasswordToServer(path, password);
        
        // 本地也保存密码
        saveClipboardPassword(path, password);
        
        // 添加到历史记录
        addToHistory(path, "", true, Date.now(), Date.now() + parseInt(expiration, 10) * 60 * 60 * 1000);
        
        // 创建但需要验证密码才能访问
        const url = `/clipboard/${path}?new=true&protected=true&exp=${expiration}`;
        console.log(`【详细日志】准备跳转到受保护的剪贴板页面:`);
        console.log(`【详细日志】- 完整URL = ${url}`);
        console.log(`【详细日志】- URL参数分析:`);
        console.log(`【详细日志】  - path = ${path}`);
        console.log(`【详细日志】  - new = true`);
        console.log(`【详细日志】  - protected = true`);
        console.log(`【详细日志】  - exp = ${expiration}`);
        router.push(url);
      } else {
        console.log(`准备创建无密码保护的剪贴板：路径=${path}`);
        
        // 添加到历史记录
        addToHistory(path, "", false, Date.now(), Date.now() + parseInt(expiration, 10) * 60 * 60 * 1000);
        
        // 无密码剪贴板，直接进入并编辑
        const url = `/clipboard/${path}?new=true&exp=${expiration}&direct=true`;
        console.log(`【详细日志】准备跳转到无保护的剪贴板页面:`);
        console.log(`【详细日志】- 完整URL = ${url}`);
        console.log(`【详细日志】- URL参数分析:`);
        console.log(`【详细日志】  - path = ${path}`);
        console.log(`【详细日志】  - new = true`);
        console.log(`【详细日志】  - exp = ${expiration}`);
        console.log(`【详细日志】  - direct = true`);
        router.push(url);
      }
    } catch (error) {
      console.error("创建剪贴板时出错:", error);
      alert("创建剪贴板失败，请重试");
    }
  };

  const handleCreateClipboard = async () => {
    setIsCreating(true);
    try {
      console.log(`【详细日志】开始创建剪贴板:`);
      console.log(`【详细日志】- 自定义路径 = ${customPath.trim() || '(未设置)'}`);
      console.log(`【详细日志】- 密码保护 = ${password ? '是' : '否'}`);
      console.log(`【详细日志】- 过期时间 = ${expiration}小时`);
      
      // 如果指定了自定义路径，先检查是否已存在
      if (customPath.trim()) {
        const pathExists = checkPathExists(customPath);
        
        if (pathExists) {
          // 打开确认对话框，而不是使用原生confirm
          setDialogData({
            path: customPath.trim(),
            action: "check_existing"
          });
          setIsDialogOpen(true);
          return;
        }
      }
      
      // 生成一个唯一ID，如果用户未指定自定义路径
      const path = customPath.trim() || generateUniqueId();
      await createClipboardWithPath(path);
      
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
          <nav className="flex items-center space-x-4">
            <Link href="/about" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">
              关于
            </Link>
            <Link 
              href="/history" 
              className="ml-1 w-9 h-9 flex items-center justify-center text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="浏览历史"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
            <ThemeSwitch />
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {/* 创建剪贴板表单 - 移到最前面 */}
        <div className="max-w-md w-full mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 transform transition-all hover:shadow-xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
            创建新的剪贴板
          </h2>
          
          <div className="space-y-5">
            <div className="transition-all duration-200 hover:translate-x-1">
              <label htmlFor="customPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                自定义路径（可选）
              </label>
              <input
                type="text"
                id="customPath"
                value={customPath}
                onChange={handlePathChange}
                placeholder="例如：my-notes"
                className={`w-full px-4 py-3 border ${pathError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors`}
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

            <div className="transition-all duration-200 hover:translate-x-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                密码保护（可选）
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="设置访问密码"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                为保障安全，密码仅会保存在您的设备上
              </p>
            </div>

            <div className="transition-all duration-200 hover:translate-x-1">
              <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                有效期
              </label>
              <select
                id="expiration"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="1">1小时</option>
                <option value="12">12小时</option>
                <option value="24">24小时</option>
                <option value="48">48小时</option>
              </select>
            </div>

            <button
              onClick={handleCreateClipboard}
              disabled={isCreating || isDialogOpen}
              className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:transform active:scale-95 text-white font-medium rounded-lg transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg ${(isCreating || isDialogOpen) ? 'opacity-70 cursor-not-allowed' : ''}`}
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

        {/* 介绍特点部分 */}
        <div className="w-full max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
            安全简单的文本共享方式
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="font-medium text-lg text-gray-800 dark:text-white">密码保护</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-300">使用密码加密您的内容，仅分享给信任的人，保障您的隐私安全</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-medium text-lg text-gray-800 dark:text-white">临时链接</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-300">所有内容在到期后自动删除，不留痕迹，保护您的数据安全</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-medium text-lg text-gray-800 dark:text-white">多设备支持</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-300">无论电脑还是手机，都能轻松访问和编辑您的内容</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 text-center text-gray-600 dark:text-gray-400">
        <p>© {new Date().getFullYear()} 云剪 - 安全地分享您的内容</p>
      </footer>
      
      {/* 路径已存在的确认对话框 */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setIsCreating(false);
        }}
        onConfirm={() => {
          setIsDialogOpen(false);
          if (dialogData.action === "check_existing") {
            handleViewExisting();
          }
        }}
        onCancel={() => {
          // 用户选择创建新的剪贴板
          if (dialogData.action === "check_existing") {
            handleCreateWithRandomPath();
          }
        }}
        title="路径已存在"
        message={`您输入的路径「${dialogData.path}」已经存在一个剪贴板内容。\n\n您是否想查看已有内容？\n- 点击「查看」访问已有剪贴板\n- 点击「创建新的」将使用随机路径创建新剪贴板`}
        confirmText="查看"
        cancelText="创建新的"
      />
    </div>
  );
}