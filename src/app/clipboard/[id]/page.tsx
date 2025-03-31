"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  encryptText, 
  decryptText, 
  formatExpirationTime,
  generateQRCodeUrl
} from "@/utils/helpers";
import { 
  getClipboard, 
  updateClipboardContent, 
  createClipboard,
  getClipboardPassword,
  saveClipboardPassword
} from "@/utils/storage";

export default function ClipboardPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isNewClipboard = searchParams.get("new") === "true";
  const isProtected = searchParams.get("protected") === "true";
  const expirationHours = parseInt(searchParams.get("exp") || "1", 10);
  
  const [content, setContent] = useState("");
  const [encryptedContent, setEncryptedContent] = useState("");
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clipboardUrl, setClipboardUrl] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}/clipboard/${id}`;
      setClipboardUrl(fullUrl);
      
      // 获取QR码
      const fetchQrCode = async () => {
        try {
          const apiUrl = generateQRCodeUrl(fullUrl);
          const response = await fetch(apiUrl);
          const data = await response.json();
          if (data.url) {
            setQrCodeDataUrl(data.url);
          }
        } catch (error) {
          console.error("获取QR码失败:", error);
        }
      };
      
      fetchQrCode();
    }
  }, [id]);
  
  useEffect(() => {
    // 清理函数，清除之前的任何超时操作
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    const loadClipboard = async () => {
      try {
        setIsLoading(true);
        
        // 检查是否是新创建的剪贴板
        if (isNewClipboard) {
          // 创建一个新的剪贴板
          const newClipboard = createClipboard(id.toString(), "", isProtected, expirationHours);
          setExpiresAt(newClipboard.expiresAt);
          
          // 如果是受密码保护的，保存密码
          if (isProtected && password) {
            saveClipboardPassword(id.toString(), password);
            setSavedPassword(password);
          }
          
          setIsAuthorized(true);
          setEditMode(true);
          setIsLoading(false);
          return;
        }
        
        // 加载现有剪贴板
        const clipboard = getClipboard(id.toString());
        
        if (!clipboard) {
          // 如果剪贴板不存在或已过期
          setIsLoading(false);
          router.push("/not-found");
          return;
        }
        
        setExpiresAt(clipboard.expiresAt);
        
        if (clipboard.isProtected) {
          // 获取保存的密码
          const savedPwd = getClipboardPassword(id.toString());
          setSavedPassword(savedPwd);
          
          if (savedPwd) {
            // 如果有已保存的密码，尝试解密
            try {
              const decrypted = await decryptText(clipboard.content, savedPwd);
              setContent(decrypted);
              setEncryptedContent(clipboard.content);
              setIsAuthorized(true);
            } catch (error) {
              // 解密失败，可能密码错误或内容已损坏
              console.error("使用保存的密码解密失败:", error);
              setIsAuthorized(false);
            }
          } else {
            // 没有保存的密码，需要用户输入
            setEncryptedContent(clipboard.content);
            setIsAuthorized(false);
          }
        } else {
          // 不受密码保护，直接显示内容
          setContent(clipboard.content);
          setIsAuthorized(true);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("加载剪贴板失败:", error);
        setIsLoading(false);
      }
    };
    
    loadClipboard();
  }, [id, isNewClipboard, isProtected, expirationHours, password, router]);
  
  // 处理内容修改并自动保存
  useEffect(() => {
    if (!isAuthorized || !editMode) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setSaveStatus("正在保存...");
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        let contentToSave = content;
        
        // 如果有密码保护，加密内容
        if (isProtected && savedPassword) {
          contentToSave = await encryptText(content, savedPassword);
        }
        
        // 更新剪贴板内容
        updateClipboardContent(id.toString(), contentToSave);
        setSaveStatus("已保存");
        
        // 3秒后清除状态提示
        setTimeout(() => setSaveStatus(""), 3000);
      } catch (error) {
        console.error("保存剪贴板失败:", error);
        setSaveStatus("保存失败");
      }
    }, 1000);
  }, [content, id, isAuthorized, editMode, isProtected, savedPassword]);
  
  const handleAuthorize = async () => {
    try {
      if (!password || !encryptedContent) return;
      
      const decrypted = await decryptText(encryptedContent, password);
      setContent(decrypted);
      setIsAuthorized(true);
      
      // 保存密码以供后续使用
      saveClipboardPassword(id.toString(), password);
      setSavedPassword(password);
    } catch (error) {
      console.error("密码验证失败:", error);
      alert("密码错误，请重试。");
    }
  };
  
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(clipboardUrl)
      .then(() => alert("链接已复制到剪贴板"))
      .catch(err => console.error("复制失败:", err));
  };
  
  const handleCopyContent = () => {
    navigator.clipboard.writeText(content)
      .then(() => alert("内容已复制到剪贴板"))
      .catch(err => console.error("复制失败:", err));
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <header className="w-full p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-800 dark:text-white">
              剪贴板共享
            </Link>
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-center mb-4 text-gray-800 dark:text-white">
              此内容受密码保护
            </h2>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                请输入密码
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                onKeyDown={(e) => e.key === "Enter" && handleAuthorize()}
              />
            </div>
            
            <button
              onClick={handleAuthorize}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              访问内容
            </button>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="w-full p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-800 dark:text-white">
            剪贴板共享
          </Link>
          
          <div className="flex items-center space-x-3">
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition"
              >
                编辑
              </button>
            )}
            {editMode && (
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition"
              >
                查看
              </button>
            )}
            <button
              onClick={handleCopyContent}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm font-medium rounded transition"
            >
              复制内容
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col md:flex-row p-4 sm:p-6 max-w-6xl mx-auto w-full gap-6">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          {editMode ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white">
                  编辑内容
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {saveStatus}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[calc(100vh-250px)] p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                placeholder="在这里输入内容..."
                autoFocus
              />
            </>
          ) : (
            <>
              <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3">
                剪贴板内容
              </h2>
              <div className="w-full h-[calc(100vh-250px)] p-4 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-auto whitespace-pre-wrap text-gray-800 dark:text-white">
                {content}
              </div>
            </>
          )}
        </div>
        
        <div className="w-full md:w-72 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              剪贴板信息
            </h3>
            
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID
                </p>
                <p className="text-gray-800 dark:text-white truncate font-mono text-sm">
                  {id}
                </p>
              </div>
              
              {expiresAt && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    过期时间
                  </p>
                  <p className="text-gray-800 dark:text-white">
                    {formatExpirationTime(expiresAt)}
                  </p>
                </div>
              )}
              
              <div className="pt-2">
                <button
                  onClick={handleCopyUrl}
                  className="w-full py-2 px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm font-medium rounded transition"
                >
                  复制链接
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              扫码访问
            </h3>
            
            <div className="flex justify-center bg-white p-2 rounded">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="访问二维码" 
                  className="w-full max-w-[200px] h-auto"
                />
              ) : (
                <div className="w-full max-w-[200px] h-[200px] flex items-center justify-center bg-gray-100">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="80" 
                    height="80" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="text-gray-400"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <path d="M7 7h.01" />
                    <path d="M17 7h.01" />
                    <path d="M7 17h.01" />
                    <rect x="10" y="10" width="4" height="4" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 