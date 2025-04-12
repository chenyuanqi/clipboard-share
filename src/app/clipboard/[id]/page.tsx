"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { 
  encryptText, 
  decryptText,
  isCryptoAvailable,
  formatExpirationTime,
  calculateExpirationTime,
  formatChinaTime,
  isExpired,
  generateUniqueId
} from "@/utils/helpers";
import { 
  getClipboard, 
  updateClipboardContent, 
  createClipboard,
  getClipboardPassword,
  saveClipboardPassword,
  addToHistory
} from "@/utils/storage";
import { decrypt } from '@/utils/crypto';
import { PrimaryButton } from '@/components/buttons';
import PasswordInput from '@/components/PasswordInput';
import QRCode from 'react-qr-code';
import ClipboardContent from '@/components/ClipboardContent';
import { 
  savePasswordToServer, 
  verifyPasswordOnServer, 
  checkPasswordExistsOnServer,
  getClipboardFromServer,
  saveClipboardToServer
} from '@/utils/api';

// 动态导入QR码组件，确保它只在客户端运行
const QRCodeComponent = dynamic(() => import('@/components/QRCode'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-[200px] h-[200px] flex items-center justify-center bg-gray-100">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-16 w-16 bg-gray-200 rounded"></div>
        <div className="mt-2 text-sm text-gray-400">加载中...</div>
      </div>
    </div>
  )
});

// 添加新的常量，用于会话存储的键名
const SESSION_AUTHORIZED_KEY = 'clipboard-session-auth';

// 定义会话存储中的授权数据类型
interface AuthData {
  [key: string]: string;
}

// 定义剪贴板数据的类型
interface ClipboardData {
  content: string;
  isProtected: boolean;
  createdAt: number;
  expiresAt: number;
  lastModified: number;
  [key: string]: any; // 允许其他属性
}

export default function ClipboardPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isNewClipboard = searchParams.get("new") === "true";
  const isProtected = searchParams.get("protected") === "true";
  const directAccess = searchParams.get("direct") === "true"; // 是否允许直接访问
  const expirationHours = parseInt(searchParams.get("exp") || "1", 10);
  
  const [content, setContent] = useState<string>("");
  const [encryptedContent, setEncryptedContent] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isSessionAuthorized, setIsSessionAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [clipboardUrl, setClipboardUrl] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordBlocked, setPasswordBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(10);
  const [isCheckingServerPassword, setIsCheckingServerPassword] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blockTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 添加一个ref来跟踪初始内容，避免首次加载时保存
  const isInitialRender = useRef(true);
  // 添加上一次保存的内容ref
  const lastSavedContent = useRef("");
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}/clipboard/${id}`;
      setClipboardUrl(fullUrl);
    }
  }, [id]);
  
  // 检查密码锁定状态 - 在页面加载时执行
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 清理过期的尝试记录
    cleanupExpiredAttempts();
    
    const now = Date.now();
    const blockUntilKey = `clipboard-block-${id}`;
    const blockUntil = Number(localStorage.getItem(blockUntilKey) || '0');
    
    // 如果存在有效的锁定时间
    if (blockUntil > now) {
      // 计算剩余阻止时间（秒）
      const remainingSeconds = Math.ceil((blockUntil - now) / 1000);
      setPasswordBlocked(true);
      setBlockTimeRemaining(remainingSeconds);
      setRemainingAttempts(0);
      
      // 设置倒计时
      if (blockTimerRef.current) {
        clearInterval(blockTimerRef.current);
      }
      
      blockTimerRef.current = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(blockTimerRef.current!);
            setPasswordBlocked(false);
            setRemainingAttempts(10);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // 初始化剩余尝试次数
      updateRemainingAttempts();
    }
    
    // 清理函数
    return () => {
      if (blockTimerRef.current) {
        clearInterval(blockTimerRef.current);
      }
    };
  }, [id]); // 仅在id变化时执行
  
  // 清理过期的尝试记录
  const cleanupExpiredAttempts = () => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const BLOCK_DURATION = 60 * 1000; // 1分钟
    
    // 检查阻止状态
    const blockUntilStr = localStorage.getItem(`clipboard-block-${id}`);
    if (blockUntilStr) {
      const blockUntil = parseInt(blockUntilStr);
      if (blockUntil > now) {
        // 仍在阻止期内
        setPasswordBlocked(true);
        setBlockTimeRemaining(Math.ceil((blockUntil - now) / 1000));
        return true;
      } else {
        // 阻止期已过
        localStorage.removeItem(`clipboard-block-${id}`);
      }
    }
    
    // 清理过期的尝试记录
    const attemptsData = localStorage.getItem(`clipboard-attempts-${id}`);
    if (attemptsData) {
      try {
        let attempts: {time: number, count: number}[] = JSON.parse(attemptsData);
        // 过滤掉一分钟前的尝试
        attempts = attempts.filter(attempt => attempt.time > now - BLOCK_DURATION);
        
        if (attempts.length > 0) {
          localStorage.setItem(`clipboard-attempts-${id}`, JSON.stringify(attempts));
          
          // 计算总尝试次数
          const totalAttempts = attempts.reduce((sum: number, attempt: {time: number, count: number}) => sum + attempt.count, 0);
          if (totalAttempts >= 10) {
            // 设置阻止到期时间
            const blockUntil = now + BLOCK_DURATION;
            localStorage.setItem(`clipboard-block-${id}`, blockUntil.toString());
            setPasswordBlocked(true);
            setBlockTimeRemaining(60); // 60秒
            return true;
          }
        } else {
          localStorage.removeItem(`clipboard-attempts-${id}`);
        }
      } catch (e) {
        console.error("清理尝试记录时出错:", e);
        localStorage.removeItem(`clipboard-attempts-${id}`);
      }
    }
    
    setPasswordBlocked(false);
    return false;
  };
  
  // 更新剩余尝试次数的函数
  const updateRemainingAttempts = () => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const attemptsKey = `clipboard-attempts-${id}`;
    
    // 获取尝试记录
    let attempts: {time: number, count: number}[] = [];
    try {
      const attemptsData = localStorage.getItem(attemptsKey);
      if (attemptsData) {
        attempts = JSON.parse(attemptsData);
        // 只保留最近一分钟的尝试
        attempts = attempts.filter(a => a.time > now - 60000);
      }
    } catch (error) {
      console.error("解析密码尝试记录失败:", error);
    }
    
    // 计算已用尝试次数
    const usedAttempts = attempts.reduce((sum, a) => sum + a.count, 0);
    
    // 更新剩余尝试次数
    setRemainingAttempts(Math.max(0, 10 - usedAttempts));
  };
  
  useEffect(() => {
    // 清理函数，清除之前的任何超时操作
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    // 加载剪贴板数据
    const loadExistingClipboard = async () => {
      try {
        // 首先从本地存储获取剪贴板
        const localClipboard = getClipboard(id.toString());
        
        // 尝试从服务器获取数据
        console.log("尝试从服务器获取剪贴板数据");
        const serverClipboard = await getClipboardFromServer(id.toString()) as ClipboardData | null;
        
        // 添加更多备份恢复选项
        let backupContent = null;
        try {
          const clipboardKey = `clipboard-content-${id}`;
          backupContent = localStorage.getItem(clipboardKey);
          if (backupContent) {
            console.log("从备份中找到剪贴板内容");
          }
        } catch (error) {
          console.error("检查备份内容失败:", error);
        }

        // 确定使用哪个剪贴板数据
        let clipboardToUse = null;
        let isFromServer = false;
        let contentSource = "";
        
        // 决策逻辑：优先选择最新的数据源
        if (serverClipboard && serverClipboard.content) {
          console.log("从服务器成功获取剪贴板数据");
          
          // 如果本地没有剪贴板数据，或者服务器数据更新，使用服务器的数据
          if (!localClipboard || serverClipboard.lastModified > localClipboard.lastModified) {
            console.log("使用服务器的剪贴板数据");
            isFromServer = true;
            contentSource = "server";
            
            // 检查服务器数据的保护状态
            console.log(`【详细日志】从服务器获取的剪贴板数据:`);
            console.log(`【详细日志】- id = ${id}`);
            console.log(`【详细日志】- isProtected = ${serverClipboard.isProtected} (${typeof serverClipboard.isProtected})`);
            console.log(`【详细日志】- createdAt = ${new Date(serverClipboard.createdAt).toLocaleString()}`);
            console.log(`【详细日志】- expiresAt = ${new Date(serverClipboard.expiresAt).toLocaleString()}`);
            console.log(`【详细日志】- lastModified = ${new Date(serverClipboard.lastModified).toLocaleString()}`);
            
            // 更新组件状态 - 注意：isProtected 是从URL参数获取的常量
            const isClipboardProtected = serverClipboard.isProtected === true;
            console.log(`【详细日志】服务器剪贴板保护状态: isProtected = ${isClipboardProtected}`);
            
            // 将服务器数据同步到本地
            clipboardToUse = createClipboard(
              id.toString(),
              serverClipboard.content,
              serverClipboard.isProtected,
              Math.max(1, Math.floor((serverClipboard.expiresAt - serverClipboard.createdAt) / (60 * 60 * 1000))),
              serverClipboard.createdAt
            );
            
            // 记录创建后的剪贴板状态
            console.log(`【详细日志】同步到本地后的剪贴板数据:`);
            console.log(`【详细日志】- id = ${clipboardToUse.id}`);
            console.log(`【详细日志】- isProtected = ${clipboardToUse.isProtected} (${typeof clipboardToUse.isProtected})`);
            console.log(`【详细日志】- createdAt = ${new Date(clipboardToUse.createdAt).toLocaleString()}`);
            console.log(`【详细日志】- expiresAt = ${new Date(clipboardToUse.expiresAt).toLocaleString()}`);
            console.log(`【详细日志】- lastModified = ${new Date(clipboardToUse.lastModified).toLocaleString()}`);
          } else {
            console.log("本地数据更新，使用本地数据");
            clipboardToUse = localClipboard;
          }
        } else if (localClipboard) {
          console.log("服务器上无数据，使用本地数据");
          clipboardToUse = localClipboard;
          contentSource = "local";
        } else {
          // 尝试从备份恢复
          console.log("尝试从备份恢复剪贴板数据");
          
          // 定义可能的备份位置列表
          const backupSources = [
            { key: `clipboard-content-${id}`, name: "常规备份" },
            { key: `clipboard-content-backup-${id}`, name: "自动保存备份" },
            { key: `clipboard-${id}`, name: "对象备份", isObject: true },
          ];
          
          // 尝试所有备份位置
          for (const source of backupSources) {
            try {
              let recoveredContent = null;
              
              if (source.isObject) {
                // 对于对象类型的备份
                const objData = localStorage.getItem(source.key);
                if (objData) {
                  try {
                    const parsed = JSON.parse(objData);
                    if (parsed && parsed.content) {
                      recoveredContent = parsed.content;
                    }
                  } catch (parseError) {
                    console.error(`从${source.name}解析对象失败:`, parseError);
                  }
                }
              } else {
                // 字符串类型的备份
                recoveredContent = localStorage.getItem(source.key);
              }
              
              if (recoveredContent) {
                console.log(`从${source.name}中找到剪贴板内容`);
                // 创建新的剪贴板对象
                clipboardToUse = createClipboard(id.toString(), recoveredContent, isProtected, 24); // 默认24小时
                contentSource = source.name;
                break; // 成功恢复，退出循环
              }
            } catch (error) {
              console.error(`从${source.name}恢复失败:`, error);
            }
          }
          
          if (backupContent && !clipboardToUse) {
            console.log("使用最简单的备份内容");
            clipboardToUse = createClipboard(id.toString(), backupContent, isProtected, 24); // 默认24小时
            contentSource = "simple_backup";
          }
        }
        
        // 如果没有找到任何数据，返回404
        if (!clipboardToUse) {
          console.log("没有找到剪贴板数据");
          setIsLoading(false);
          router.push("/not-found");
          return false;
        }
        
        // 设置过期时间
        setExpiresAt(clipboardToUse.expiresAt);
        
        // 如果是从服务器获取的，并且本地没有，尝试将服务器数据同步到本地
        if (isFromServer && !localClipboard) {
          try {
            console.log("将服务器数据同步到本地");
            // 本地保存已经在createClipboard中完成
          } catch (error) {
            console.error("将服务器数据同步到本地失败:", error);
          }
        }
        
        // 处理剪贴板认证
        if (clipboardToUse.isProtected) {
          // 获取保存的密码信息
          const savedPwd = getClipboardPassword(id.toString());
          setSavedPassword(savedPwd);
          
          // 检查会话存储中是否有已授权记录
          let hasSessionAuth = false;
          let sessionPwd = null;
          try {
            const sessionAuth = sessionStorage.getItem(SESSION_AUTHORIZED_KEY);
            if (sessionAuth) {
              const authData = JSON.parse(sessionAuth);
              if (authData[id]) {
                hasSessionAuth = true;
                sessionPwd = authData[id];
                console.log("会话存储中已有授权记录");
              }
            }
          } catch (error) {
            console.error("检查会话存储授权记录失败:", error);
          }
          
          // 尝试从直接保存的位置获取密码
          let directPwd = null;
          if (!savedPwd) {
            try {
              const directKey = `clipboard-pwd-${id}`;
              directPwd = localStorage.getItem(directKey);
              if (directPwd) {
                console.log("从备份位置找到密码");
                setSavedPassword(directPwd);
                // 同时更新到正常存储位置
                saveClipboardPassword(id.toString(), directPwd);
              }
            } catch (error) {
              console.error("尝试获取备份密码失败:", error);
            }
          }
          
          // 设置加密内容
          setEncryptedContent(clipboardToUse.content);
          
          // 先检查服务器是否存在密码
          console.log("正在检查服务器上是否存在密码...");
          setIsCheckingServerPassword(true);
          
          try {
            const serverHasPassword = await checkPasswordExistsOnServer(id.toString());
            console.log("服务器上是否存在密码:", serverHasPassword);
            
            // 获取可能的密码
            const autoPassword = sessionPwd || savedPwd || directPwd || "";
            
            // 如果有自动密码可以尝试
            if (autoPassword) {
              console.log("检测到保存的密码，尝试验证...");
              setPassword(autoPassword);
              
              // 初始化验证结果
              let isVerified = false;
              
              // 尝试服务器验证
              if (serverHasPassword) {
                try {
                  const serverResult = await verifyPasswordOnServer(id.toString(), autoPassword);
                  isVerified = serverResult === true;
                  console.log("服务器密码验证结果:", isVerified ? "成功" : "失败");
                } catch (error) {
                  console.error("服务器密码验证失败:", error);
                }
              }
              
              // 如果服务器验证失败，尝试本地验证
              if (!isVerified && (savedPwd || directPwd)) {
                const localVerified = 
                  (savedPwd !== null && autoPassword === savedPwd) || 
                  (directPwd !== null && autoPassword === directPwd);
                  
                isVerified = localVerified;
                console.log("本地密码验证结果:", localVerified ? "成功" : "失败");
              }
              
              // 根据验证结果处理
              if (isVerified || directAccess) {
                // 验证成功或允许直接访问
                setIsAuthorized(true);
                
                // 尝试解密内容
                if (clipboardToUse.content) {
                  try {
                    console.log("尝试解密内容...");
                    // 添加更详细的日志以便调试
                    console.log(`解密前检查 - window类型: ${typeof window}`);
                    if (typeof window !== 'undefined') {
                      console.log(`解密前检查 - window.crypto可用: ${!!window.crypto}`);
                      console.log(`解密前检查 - window.crypto.subtle可用: ${!!window.crypto?.subtle}`);
                      console.log(`解密前检查 - isCryptoAvailable: ${isCryptoAvailable()}`);
                    }
                    
                    // 检查当前内容是否是加密的（是否以CRYPTO:或SIMPLE:开头）
                    const isEncryptedContent = 
                      clipboardToUse.content.startsWith('CRYPTO:') || 
                      clipboardToUse.content.startsWith('SIMPLE:');
                    
                    if (isEncryptedContent) {
                      console.log("检测到加密内容，尝试解密");
                      try {
                        const decrypted = await decryptText(clipboardToUse.content, autoPassword);
                        setContent(decrypted);
                        // 记录解密后的初始内容，避免初始渲染时触发保存
                        lastSavedContent.current = decrypted;
                        setEditMode(false); // 默认显示查看模式
                        
                        // 添加到历史记录
                        addToHistory(
                          id.toString(),
                          decrypted,
                          true, // 有密码加密的内容肯定是受保护的
                          clipboardToUse?.createdAt || Date.now(),
                          clipboardToUse?.expiresAt || (Date.now() + expirationHours * 3600 * 1000)
                        );
                      } catch (decryptError) {
                        console.error("内容解密失败:", decryptError);
                        
                        // 解密失败但验证成功，说明可能是格式问题或API不可用
                        // 尝试保留原始加密内容，允许用户查看或编辑
                        const originalContent = clipboardToUse.content;
                        const isSimpleFormat = originalContent.startsWith('SIMPLE:');
                        const isCryptoFormat = originalContent.startsWith('CRYPTO:');
                        
                        if (originalContent && (isSimpleFormat || isCryptoFormat)) {
                          // 如果是明确的加密格式但解密失败，保留加密内容并提供明确提示
                          setContent(`解密失败，但您可以重新输入内容。\n原始加密内容已保留。\n格式: ${isSimpleFormat ? 'SIMPLE' : 'CRYPTO'}`);
                          lastSavedContent.current = originalContent; // 保留原始加密内容，避免自动保存覆盖
                          // 设置编辑模式便于用户重新输入
                          setEditMode(true);
                        } else {
                          // 如果无法解析加密格式，使用空内容
                          setContent("");
                          lastSavedContent.current = "";
                          setEditMode(true); // 直接进入编辑模式
                        }
                        
                        // 使用警告提示而不是错误消息
                        console.log("由于解密问题，已切换到编辑模式 - 您可以重新输入内容");
                      }
                    } else {
                      // 内容不是加密的，直接显示
                      console.log("内容未加密，直接显示");
                      setContent(clipboardToUse.content);
                      lastSavedContent.current = clipboardToUse.content;
                      setEditMode(false); // 默认查看模式
                      
                      // 添加到历史记录
                      addToHistory(
                        id.toString(),
                        clipboardToUse.content,
                        clipboardToUse.isProtected,
                        clipboardToUse.createdAt,
                        clipboardToUse.expiresAt
                      );
                    }
                  } catch (error) {
                    console.error("内容解密失败:", error);
                    // 设置空内容以防万一
                    setContent("");
                    lastSavedContent.current = "";
                    setEditMode(true);
                  }
                } else {
                  // 内容为空
                  setContent("");
                  lastSavedContent.current = "";
                  setEditMode(true);
                }
                
                // 保存到会话存储
                try {
                  let authData: AuthData = {};
                  const existingAuthData = sessionStorage.getItem(SESSION_AUTHORIZED_KEY);
                  if (existingAuthData) {
                    try {
                      authData = JSON.parse(existingAuthData);
                    } catch (e) {
                      authData = {};
                    }
                  }
                  
                  authData[id] = autoPassword;
                  sessionStorage.setItem(SESSION_AUTHORIZED_KEY, JSON.stringify(authData));
                  console.log("授权信息已更新到会话存储");
                } catch (error) {
                  console.error("保存到会话存储失败:", error);
                }
              } else {
                // 验证失败
                console.log("自动验证失败，需要用户手动输入密码");
                setIsSessionAuthorized(false);
                setIsAuthorized(false);
              }
            } else {
              // 没有保存的密码
              console.log("没有可用的保存密码，需要用户手动输入");
              setIsAuthorized(false);
            }
          } catch (error) {
            console.error("检查或验证密码时出错:", error);
            setIsAuthorized(false);
          } finally {
            setIsCheckingServerPassword(false);
          }
        } else {
          // 不受密码保护，直接显示内容
          setContent(clipboardToUse.content);
          // 记录初始内容，避免不必要的保存
          lastSavedContent.current = clipboardToUse.content;
          setIsAuthorized(true);
          // 设置为查看模式，确保内容显示在查看区域
          setEditMode(false);
          
          // 添加到历史记录
          addToHistory(
            id.toString(),
            clipboardToUse.content,
            clipboardToUse.isProtected,
            clipboardToUse.createdAt,
            clipboardToUse.expiresAt
          );
        }
        
        setIsLoading(false);
        return true;
      } catch (error) {
        console.error("加载剪贴板失败:", error);
        
        // 尝试从所有可能的备份恢复一次
        try {
          console.log("发生错误，尝试最后一次从备份恢复...");
          let recoveredContent = null;
          let recoverySource = "";
          
          // 检查所有可能的备份
          const backupKeys = [
            `clipboard-content-${id}`,
            `clipboard-content-backup-${id}`,
            `clipboard-${id}`
          ];
          
          for (const key of backupKeys) {
            try {
              const data = localStorage.getItem(key);
              if (data) {
                if (key === `clipboard-${id}`) {
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.content) {
                      recoveredContent = parsed.content;
                      recoverySource = "对象备份";
                      break;
                    }
                  } catch (e) { /* 继续尝试其他备份 */ }
                } else {
                  recoveredContent = data;
                  recoverySource = key;
                  break;
                }
              }
            } catch (e) { /* 继续尝试其他备份 */ }
          }
          
          if (recoveredContent) {
            console.log(`紧急恢复成功，来源: ${recoverySource}`);
            setContent(recoveredContent);
            lastSavedContent.current = recoveredContent;
            setIsAuthorized(true);
            setEditMode(true);
            setIsLoading(false);
            
            // 显示恢复提示
            setSaveStatus("已从备份恢复内容");
            setTimeout(() => setSaveStatus("请检查内容并手动保存"), 3000);
            
            return true;
          }
        } catch (recoveryError) {
          console.error("紧急恢复尝试失败:", recoveryError);
        }
        
        setIsLoading(false);
        router.push("/not-found");
        return false;
      }
    };
    
    const loadClipboard = async () => {
      try {
        setIsLoading(true);
        
        // 重置初始渲染标志，确保新加载的内容不会触发自动保存
        isInitialRender.current = true;
        
        // 详细记录所有URL参数
        console.log(`【详细日志】loadClipboard开始 - URL参数解析:`);
        console.log(`【详细日志】- id = ${id}`);
        console.log(`【详细日志】- isNewClipboard = ${isNewClipboard}`);
        console.log(`【详细日志】- isProtected = ${isProtected} (${typeof isProtected})`);
        console.log(`【详细日志】- directAccess = ${directAccess}`);
        console.log(`【详细日志】- expirationHours = ${expirationHours}`);
        console.log(`【详细日志】- 原始URL参数:`);
        console.log(`【详细日志】  - new = ${searchParams.get("new")}`);
        console.log(`【详细日志】  - protected = ${searchParams.get("protected")}`);
        console.log(`【详细日志】  - direct = ${searchParams.get("direct")}`);
        console.log(`【详细日志】  - exp = ${searchParams.get("exp")}`);
        console.log(`【详细日志】  - 完整URL = ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`);
        
        // 检查是否被阻止
        if (cleanupExpiredAttempts()) {
          setIsLoading(false);
          return;
        }
        
        // 如果是新剪贴板
        if (isNewClipboard) {
          console.log("加载新创建的剪贴板");
          
          // 检查剪贴板是否已经存在 (防止重复创建)
          const existingClipboard = getClipboard(id.toString());
          if (existingClipboard) {
            console.log("剪贴板已存在，不再重新创建");
            // 如果剪贴板已存在，只更新URL (移除新建参数)
            const url = new URL(window.location.href);
            url.searchParams.delete('new');
            url.searchParams.delete('exp');
            url.searchParams.delete('protected');
            window.history.replaceState({}, '', url.toString());
            
            // 然后像加载已有剪贴板一样处理
            await loadExistingClipboard();
            return;
          }
          
          // 检查是否有备份内容可以恢复
          let hasBackupContent = false;
          let backupContent = "";
          
          try {
            // 检查可能的备份位置
            const backupKeys = [
              `clipboard-content-${id}`,
              `clipboard-content-backup-${id}`,
              `clipboard-${id}`
            ];
            
            for (const key of backupKeys) {
              const data = localStorage.getItem(key);
              if (data) {
                if (key === `clipboard-${id}`) {
                  // 对象格式备份
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.content) {
                      backupContent = parsed.content;
                      hasBackupContent = true;
                      console.log(`找到对象格式的备份内容，长度: ${backupContent.length}`);
                      break;
                    }
                  } catch (e) {
                    console.error("解析对象备份失败:", e);
                  }
                } else {
                  // 字符串格式备份
                  backupContent = data;
                  hasBackupContent = true;
                  console.log(`找到字符串格式的备份内容，长度: ${backupContent.length}`);
                  break;
                }
              }
            }
          } catch (error) {
            console.error("检查备份内容失败:", error);
          }
          
          // 从URL参数中获取密码
          const urlPassword = searchParams.get("password");
          const passwordToUse = urlPassword || password;
          
          console.log(`URL参数：isProtected = ${isProtected}, passwordToUse = ${passwordToUse ? '已设置' : '未设置'}`);
          
          // 创建一个新的剪贴板 - 传入创建时间作为基准计算过期时间
          const createdAt = Date.now();
          const expiresAt = calculateExpirationTime(expirationHours, createdAt);
          console.log(`【详细日志】准备创建新剪贴板:`);
          console.log(`【详细日志】- ID = ${id}`);
          console.log(`【详细日志】- isProtected = ${isProtected} (${typeof isProtected})`);
          console.log(`【详细日志】- isProtected来源 = 'URL参数: protected=${searchParams.get("protected")}'`);
          console.log(`【详细日志】- passwordToUse = ${passwordToUse ? '已设置' : '未设置'}`);
          console.log(`【详细日志】- expirationHours = ${expirationHours}`);
          console.log(`【详细日志】- 创建时间 = ${new Date(createdAt).toLocaleString()}`);
          console.log(`【详细日志】- 过期时间 = ${new Date(expiresAt).toLocaleString()}`);
          console.log(`【详细日志】- 是否有备份内容 = ${hasBackupContent}`);
          
          // 确保这里传递的isProtected与URL参数一致
          const protectedValue = searchParams.get("protected") === "true";
          const initialContent = hasBackupContent ? backupContent : "";
          const newClipboard = createClipboard(id.toString(), initialContent, protectedValue, expirationHours, createdAt);
          
          console.log(`【详细日志】剪贴板创建结果:`);
          console.log(`【详细日志】- ID = ${newClipboard.id}`);
          console.log(`【详细日志】- isProtected = ${newClipboard.isProtected} (${typeof newClipboard.isProtected})`);
          console.log(`【详细日志】- createdAt = ${new Date(newClipboard.createdAt).toLocaleString()}`);
          console.log(`【详细日志】- expiresAt = ${new Date(newClipboard.expiresAt).toLocaleString()}`);
          
          setExpiresAt(newClipboard.expiresAt);
          
          // 立即将新剪贴板保存到服务器
          try {
            console.log(`【详细日志】将新创建的剪贴板保存到服务器...`);
            let initialServerContent = initialContent;
            
            // 如果有密码且有内容，加密后再保存到服务器
            if (protectedValue && passwordToUse && initialContent) {
              try {
                initialServerContent = await encryptText(initialContent, passwordToUse);
                console.log("初始内容已加密，准备保存到服务器");
              } catch (encryptError) {
                console.error("加密初始内容失败:", encryptError);
                // 使用简单加密备用方案
                initialServerContent = 'SIMPLE:' + btoa(initialContent);
              }
            }
            
            const serverSaveSuccess = await saveClipboardToServer(
              id.toString(),
              initialServerContent, // 使用可能有的初始内容
              newClipboard.isProtected, 
              expirationHours
            );
            console.log(`【详细日志】剪贴板保存到服务器结果: ${serverSaveSuccess ? '成功' : '失败'}`);
          } catch (error) {
            console.error("保存新剪贴板到服务器失败:", error);
          }
          
          // 处理剪贴板授权
          if (isProtected && passwordToUse) {
            // 确保在这里保存密码到localStorage
            const saveResult = saveClipboardPassword(id.toString(), passwordToUse);
            setSavedPassword(passwordToUse);
            setEncryptedContent(""); // 空内容，等待用户输入
            
            // 添加调试日志
            console.log("新建受保护剪贴板，密码已保存:", passwordToUse, "结果:", saveResult);
            
            // 立即检查密码是否成功保存
            const verifyPassword = getClipboardPassword(id.toString());
            console.log("验证密码是否成功保存:", verifyPassword);
            
            // 同时保存到服务器
            try {
              const serverSaved = await savePasswordToServer(id.toString(), passwordToUse);
              console.log("密码是否成功保存到服务器:", serverSaved);
            } catch (error) {
              console.error("保存密码到服务器失败:", error);
            }
            
            // 如果保存失败，尝试直接使用localStorage API
            if (!verifyPassword) {
              try {
                console.log("尝试直接使用localStorage保存密码");
                const key = `clipboard-pwd-${id}`;
                localStorage.setItem(key, passwordToUse);
                console.log("直接保存结果:", localStorage.getItem(key));
              } catch (error) {
                console.error("直接保存密码失败:", error);
              }
            }
            
            // 根据页面初始化方式决定授权状态
            if (directAccess) {
              // 如果是从首页创建并直接访问模式
              setIsAuthorized(true);
              setEditMode(true);
              
              // 检查是否已经有内容，如果有则不清空
              const existingClipboard = getClipboard(id.toString());
              if (!existingClipboard || !existingClipboard.content) {
                // 仅当没有现有内容时才设置空内容
                setContent("");
                lastSavedContent.current = "";
              } else {
                // 如果有现有内容，使用它
                setContent(existingClipboard.content);
                lastSavedContent.current = existingClipboard.content;
              }
              console.log("直接访问模式：自动授权" + (existingClipboard?.content ? "，使用现有内容" : "，使用空内容"));
            } else {
              // 普通访问模式，需要验证密码
              setIsAuthorized(false);
              console.log("普通访问模式：需要验证密码");
            }
          } else {
            // 不受保护的剪贴板，直接授权
            setIsAuthorized(true);
            setEditMode(true);
            // 设置初始空内容，避免保存
            setContent("");
            lastSavedContent.current = "";
          }
          
          // 创建后立即移除URL参数，防止刷新页面时重新创建
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('new');
            url.searchParams.delete('exp');
            url.searchParams.delete('direct');
            // 密码保护参数暂时保留，在验证成功后移除
            window.history.replaceState({}, '', url.toString());
          }
          
          setIsLoading(false);
          return;
        }
        
        // 加载现有剪贴板
        await loadExistingClipboard();
      } catch (error) {
        console.error("加载剪贴板失败:", error);
        setIsLoading(false);
      }
    };
    
    loadClipboard();
    
    // 更新剩余阻止时间
    const blockTimer = setInterval(() => {
      if (passwordBlocked && blockTimeRemaining > 0) {
        setBlockTimeRemaining(prev => prev - 1);
      } else if (passwordBlocked && blockTimeRemaining <= 0) {
        setPasswordBlocked(false);
        localStorage.removeItem(`clipboard-block-${id}`);
      }
    }, 1000);
    
    return () => clearInterval(blockTimer);
  }, [id, isNewClipboard, isProtected, expirationHours, password, router, searchParams]);
  
  // 处理内容修改并自动保存
  useEffect(() => {
    if (!isAuthorized || !editMode) return;
    
    // 如果是初始渲染，不触发保存
    if (isInitialRender.current) {
      isInitialRender.current = false;
      // 确保初始内容被记录，避免丢失
      if (content) {
        lastSavedContent.current = content;
        
        // 额外的本地备份
        try {
          const clipboardKey = `clipboard-content-backup-${id}`;
          localStorage.setItem(clipboardKey, content);
        } catch (error) {
          console.error("初始内容本地备份失败:", error);
        }
      }
      return;
    }
    
    // 检查内容是否真的变化了
    if (content === lastSavedContent.current) {
      console.log("内容未变更，不触发保存");
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setSaveStatus("正在保存...");
    
    // 立即进行本地备份
    try {
      const clipboardKey = `clipboard-content-backup-${id}`;
      localStorage.setItem(clipboardKey, content);
    } catch (backupError) {
      console.error("自动保存备份失败:", backupError);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        let contentToSave = content;
        let serverSaveSuccess = false;
        
        // 更新最后保存的内容引用
        lastSavedContent.current = content;
        
        // 获取当前剪贴板信息，以获取创建时间和保护状态
        const currentClipboard = getClipboard(id.toString());
        const createdTime = currentClipboard ? currentClipboard.createdAt : Date.now();
        
        // 使用当前剪贴板的保护状态，而不是组件状态
        const clipboardIsProtected = currentClipboard ? currentClipboard.isProtected : isProtected;
        
        console.log(`【详细日志】自动保存检查当前状态:`);
        console.log(`【详细日志】- id = ${id}`);
        console.log(`【详细日志】- URL参数isProtected = ${isProtected} (${typeof isProtected})`);
        console.log(`【详细日志】- 当前clipboardIsProtected = ${clipboardIsProtected} (${typeof clipboardIsProtected})`);
        console.log(`【详细日志】- savedPassword = ${savedPassword ? '已设置' : '未设置'}`);
        console.log(`【详细日志】- 当前剪贴板状态:`, currentClipboard ? {
          id: currentClipboard.id,
          isProtected: currentClipboard.isProtected,
          createdAt: new Date(currentClipboard.createdAt).toLocaleString(),
          expiresAt: new Date(currentClipboard.expiresAt).toLocaleString()
        } : '不存在');
        
        // 计算过期时间（小时）
        const expirationHours = expiresAt ? Math.max(1, Math.floor((expiresAt - createdTime) / (60 * 60 * 1000))) : 24;
        
        // 处理密码保护的内容
        if (clipboardIsProtected) {
          console.log(`【详细日志】剪贴板设置为受保护`);
          // 检查是否有有效的密码
          if (savedPassword && typeof savedPassword === 'string' && savedPassword.trim()) {
            try {
              // 密码有效，尝试加密内容
              console.log("密码有效，进行内容加密");
              
              try {
                // 使用我们的修改后的encryptText函数（会自动检查Web Crypto API）
                contentToSave = await encryptText(content, savedPassword);
                console.log("内容已加密，准备保存");
              } catch (encryptError) {
                console.error("加密失败:", encryptError);
                
                // 如果加密失败，不要直接使用未加密内容（这可能会导致数据泄露）
                // 而是尝试使用备用的简单加密方法
                try {
                  console.log("尝试使用备用简单加密方法");
                  // 使用简单的加密格式
                  contentToSave = 'SIMPLE:' + btoa(content);
                  console.log("使用备用加密格式成功，准备保存");
                } catch (fallbackEncryptError) {
                  console.error("备用加密也失败:", fallbackEncryptError);
                  
                  // 最后的备用选项 - 显式提示用户并提供恢复选项
                  contentToSave = content;
                  console.log("由于加密失败，将保存未加密内容，但会在UI中提醒用户");
                  
                  // 在UI中显示警告
                  setSaveStatus("加密失败，已保存未加密内容");
                  setTimeout(() => {
                    setSaveStatus("请考虑导出内容并重新创建剪贴板");
                  }, 3000);
                }
              }
              
              // 保存加密后的内容到服务器
              console.log(`【详细日志】准备保存到服务器(有保护):`);
              console.log(`【详细日志】- id = ${id}`);
              console.log(`【详细日志】- clipboardIsProtected = ${clipboardIsProtected} (${typeof clipboardIsProtected})`);
              console.log(`【详细日志】- expirationHours = ${expirationHours}`);
              
              serverSaveSuccess = await saveClipboardToServer(
                id.toString(), 
                contentToSave, 
                true, // 明确传递true
                expirationHours
              );
            } catch (error) {
              console.error("加密内容失败:", error);
              setSaveStatus("加密失败");
              
              // 加密失败，使用未加密内容保存，确保用户的工作不会丢失
              try {
                console.log("尝试以不加密方式保存内容");
                serverSaveSuccess = await saveClipboardToServer(
                  id.toString(), 
                  content, 
                  clipboardIsProtected, 
                  expirationHours
                );
                setSaveStatus("已保存(未加密)");
              } catch (fallbackError) {
                console.error("回退保存也失败:", fallbackError);
                setSaveStatus("保存失败");
                return;
              }
            }
          } else {
            // 无有效密码，使用未加密内容保存
            console.error("加密失败: 保存的密码无效");
            setSaveStatus("密码无效，未加密");
            
            try {
              console.log("由于密码无效，将以未加密方式保存内容");
              serverSaveSuccess = await saveClipboardToServer(
                id.toString(), 
                content, 
                clipboardIsProtected, 
                expirationHours
              );
            } catch (error) {
              console.error("保存未加密内容失败:", error);
              setSaveStatus("保存失败");
              return;
            }
          }
        } else {
          // 非密码保护的内容，直接保存（不需要任何加密）
          console.log(`【详细日志】剪贴板未设置保护，直接保存原始内容`);
          console.log(`【详细日志】准备保存到服务器(无保护):`);
          console.log(`【详细日志】- id = ${id}`);
          console.log(`【详细日志】- clipboardIsProtected = ${clipboardIsProtected} (${typeof clipboardIsProtected})`);
          console.log(`【详细日志】- isProtected = ${isProtected} (${typeof isProtected})`);
          console.log(`【详细日志】- savedPassword存在: ${!!savedPassword}`);
          console.log(`【详细日志】- expirationHours = ${expirationHours}`);
          
          try {
            serverSaveSuccess = await saveClipboardToServer(
              id.toString(), 
              content, 
              false, 
              expirationHours
            );
          } catch (error) {
            console.error("保存未加密内容失败:", error);
            setSaveStatus("保存失败");
            return;
          }
        }
        
        console.log("内容保存到服务器结果:", serverSaveSuccess ? "成功" : "失败");
        
        // 更新本地剪贴板内容
        const updateResult = updateClipboardContent(id.toString(), contentToSave);
        
        // 处理保存结果
        if (updateResult) {
          console.log("内容已成功保存到本地存储");
          setSaveStatus(serverSaveSuccess ? "已保存(本地+服务器)" : "已保存(仅本地)");
          
          // 为了额外保证，也直接保存到localStorage
          try {
            const clipboardKey = `clipboard-content-${id}`;
            localStorage.setItem(clipboardKey, contentToSave);
          } catch (error) {
            console.error("直接保存内容失败:", error);
          }
        } else {
          console.error("保存内容到本地存储失败");
          
          if (serverSaveSuccess) {
            setSaveStatus("已保存(仅服务器)");
          } else {
            setSaveStatus("保存失败");
            
            // 尝试直接使用localStorage作为备份
            try {
              const clipboardKey = `clipboard-content-${id}`;
              localStorage.setItem(clipboardKey, contentToSave);
              console.log("内容已保存到备份存储");
              setSaveStatus("已保存到备份");
            } catch (backupError) {
              console.error("备份保存也失败:", backupError);
            }
          }
        }
        
        // 如果URL包含new=true参数，移除该参数，防止刷新页面时重新创建剪贴板
        if (isNewClipboard && typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('new');
          // 使用替换模式，不会在历史记录中添加新条目
          window.history.replaceState({}, '', url.toString());
        }
        
        // 3秒后清除状态提示
        setTimeout(() => setSaveStatus(""), 3000);
      } catch (error) {
        console.error("保存剪贴板失败:", error);
        setSaveStatus("保存失败");
      }
    }, 1000);
  }, [content, id, isAuthorized, editMode, isProtected, savedPassword, isNewClipboard, expiresAt]);
  
  // 记录密码失败尝试
  const recordFailedAttempt = () => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    let attempts = [];
    
    const attemptsData = localStorage.getItem(`clipboard-attempts-${id}`);
    if (attemptsData) {
      try {
        attempts = JSON.parse(attemptsData);
      } catch (e) {
        attempts = [];
      }
    }
    
    // 查找当前这一分钟的记录
    const currentMinuteAttempt = attempts.find((a: {time: number, count: number}) => 
      Math.floor(a.time / 60000) === Math.floor(now / 60000)
    );
    
    if (currentMinuteAttempt) {
      currentMinuteAttempt.count += 1;
    } else {
      attempts.push({ time: now, count: 1 });
    }
    
    localStorage.setItem(`clipboard-attempts-${id}`, JSON.stringify(attempts));
    
    // 检查是否达到阻止阈值
    const totalAttempts = attempts.reduce((sum: number, attempt: {time: number, count: number}) => sum + attempt.count, 0);
    if (totalAttempts >= 10) {
      const blockUntil = now + 60 * 1000; // 阻止1分钟
      localStorage.setItem(`clipboard-block-${id}`, blockUntil.toString());
      setPasswordBlocked(true);
      setBlockTimeRemaining(60);
    }
  };

  // 清理函数
  useEffect(() => {
    return () => {
      if (blockTimerRef.current) {
        clearInterval(blockTimerRef.current);
      }
    };
  }, []);
  
  const handleAuthorize = async () => {
    console.log("开始密码验证");
    setErrorMessage(null);
    
    if (!password) {
      setErrorMessage("请输入密码");
      return;
    }
    
    // 检查是否被阻止
    if (cleanupExpiredAttempts()) {
      console.log("密码尝试已被阻止");
      return;
    }
    
    try {
      setIsLoading(true); // 添加加载状态
      console.log("尝试验证密码...");
      
      // 首先检查服务器上是否存在密码
      let serverHasPassword = false;
      try {
        serverHasPassword = await checkPasswordExistsOnServer(id.toString());
        console.log("服务器上是否存在密码:", serverHasPassword);
      } catch (error) {
        console.error("检查服务器密码失败:", error);
      }
      
      // 验证密码（优先使用服务器验证）
      let passwordVerified = false;
      
      // 如果服务器上有密码，首先尝试服务器验证
      if (serverHasPassword) {
        try {
          const serverResult = await verifyPasswordOnServer(id.toString(), password);
          passwordVerified = serverResult === true;
          console.log("服务器密码验证结果:", passwordVerified ? "成功" : "失败");
        } catch (error) {
          console.error("服务器密码验证失败:", error);
        }
      }
      
      // 获取本地存储的密码
      const storedPassword = getClipboardPassword(id.toString());
      console.log("从存储中检索的密码:", storedPassword ? '存在' : 'null');
      
      // 尝试从备份位置获取密码
      let backupPassword = null;
      try {
        const directKey = `clipboard-pwd-${id}`;
        backupPassword = localStorage.getItem(directKey);
        console.log("从备份位置检索的密码:", backupPassword ? '存在' : 'null');
      } catch (error) {
        console.error("尝试获取备份密码失败:", error);
      }
      
      // 如果服务器验证失败，尝试本地验证
      if (!passwordVerified && (storedPassword || savedPassword || backupPassword)) {
        const localVerified = 
          (storedPassword !== null && password === storedPassword) || 
          (savedPassword !== null && password === savedPassword) ||
          (backupPassword !== null && password === backupPassword);
          
        passwordVerified = localVerified;
        console.log("本地密码验证结果:", localVerified ? "成功" : "失败");
      }
      
      // 如果密码不匹配，显示错误信息并记录失败尝试
      if (!passwordVerified) {
        console.log("密码不匹配");
        setErrorMessage("密码错误，请重试");
        recordFailedAttempt();
        setIsLoading(false);
        return;
      }
      
      console.log("密码匹配成功");
      setIsAuthorized(true);
      
      // 对已有内容进行解密（如果有）
      if (encryptedContent) {
        try {
          console.log("尝试解密内容...");
          // 添加更详细的日志以便调试
          console.log(`解密前检查 - window类型: ${typeof window}`);
          if (typeof window !== 'undefined') {
            console.log(`解密前检查 - window.crypto可用: ${!!window.crypto}`);
            console.log(`解密前检查 - window.crypto.subtle可用: ${!!window.crypto?.subtle}`);
            console.log(`解密前检查 - isCryptoAvailable: ${isCryptoAvailable()}`);
          }
          
          // 检查当前内容是否是加密的（是否以CRYPTO:或SIMPLE:开头）
          const isEncryptedContent = 
            encryptedContent.startsWith('CRYPTO:') || 
            encryptedContent.startsWith('SIMPLE:');
          
          if (isEncryptedContent) {
            try {
              const decrypted = await decryptText(encryptedContent, password);
              setContent(decrypted);
              setEditMode(false); // 默认显示查看模式
              
              // 添加到历史记录
              addToHistory(
                id.toString(),
                decrypted,
                true, // 有密码加密的内容肯定是受保护的
                clipboardToUse?.createdAt || Date.now(),
                clipboardToUse?.expiresAt || (Date.now() + expirationHours * 3600 * 1000)
              );
            } catch (decryptError) {
              console.error("内容解密失败:", decryptError);
              
              // 解密失败但验证成功，说明可能是格式问题或API不可用
              // 尝试保留原始加密内容，允许用户查看或编辑
              const originalContent = encryptedContent;
              const isSimpleFormat = originalContent.startsWith('SIMPLE:');
              const isCryptoFormat = originalContent.startsWith('CRYPTO:');
              
              if (originalContent && (isSimpleFormat || isCryptoFormat)) {
                // 如果是明确的加密格式但解密失败，保留加密内容并提供明确提示
                setContent(`解密失败，但您可以重新输入内容。\n原始加密内容已保留。\n格式: ${isSimpleFormat ? 'SIMPLE' : 'CRYPTO'}`);
                lastSavedContent.current = originalContent; // 保留原始加密内容，避免自动保存覆盖
                // 设置编辑模式便于用户重新输入
                setEditMode(true);
              } else {
                // 如果无法解析加密格式，使用空内容
                setContent("");
                lastSavedContent.current = "";
                setEditMode(true); // 直接进入编辑模式
              }
              
              // 使用警告提示而不是错误消息
              console.log("由于解密问题，已切换到编辑模式 - 您可以重新输入内容");
            }
          } else {
            // 内容不是加密的，直接显示
            console.log("内容未加密，直接显示");
            setContent(encryptedContent);
            setEditMode(false); // 默认查看模式
          }
        } catch (error) {
          console.error("内容解密失败:", error);
        }
      }
      
      // 确保状态中保存正确的密码
      if (!savedPassword) {
        setSavedPassword(password);
      }
      
      // 确保密码存储在标准位置
      if (!storedPassword) {
        saveClipboardPassword(id.toString(), password);
      }
      
      // 将成功的密码保存到会话存储，这样下次不需要重新输入
      try {
        let authData: AuthData = {};
        const existingAuthData = sessionStorage.getItem(SESSION_AUTHORIZED_KEY);
        if (existingAuthData) {
          try {
            authData = JSON.parse(existingAuthData);
          } catch (e) {
            console.error("解析现有会话数据失败:", e);
            authData = {};
          }
        }
        
        // 添加当前ID和密码
        authData[id] = password;
        sessionStorage.setItem(SESSION_AUTHORIZED_KEY, JSON.stringify(authData));
        console.log("授权信息已保存到会话存储");
      } catch (error) {
        console.error("保存到会话存储失败:", error);
      }
      
      // 如果是服务器匹配但本地没有，同步到本地
      if (serverHasPassword && !storedPassword && !backupPassword) {
        console.log("从服务器同步密码到本地");
        saveClipboardPassword(id.toString(), password);
        try {
          const directKey = `clipboard-pwd-${id}`;
          localStorage.setItem(directKey, password);
        } catch (error) {
          console.error("备份保存密码失败:", error);
        }
      }
      
      // 验证成功后，移除URL中的protected参数
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('protected');
        window.history.replaceState({}, '', url.toString());
      }

      // 在授权成功后添加到历史记录
      recordToHistory(clipboardToUse);
    } catch (error) {
      console.error("密码验证过程出错:", error);
      setErrorMessage("验证过程发生错误，请重试");
      recordFailedAttempt();
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyUrl = () => {
    try {
      // 创建一个临时的文本区域元素
      const textArea = document.createElement('textarea');
      textArea.value = clipboardUrl;
      textArea.style.position = 'fixed';  // 避免滚动到底部
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // 尝试使用execCommand进行复制
      const successful = document.execCommand('copy');
      if (successful) {
        setCopyStatus("链接已复制");
        setTimeout(() => setCopyStatus(""), 2000);
      } else {
        // 如果execCommand失败，尝试使用Clipboard API
        navigator.clipboard.writeText(clipboardUrl)
          .then(() => {
            setCopyStatus("链接已复制");
            setTimeout(() => setCopyStatus(""), 2000);
          })
          .catch(err => {
            console.error("复制链接失败:", err);
            setCopyStatus("复制失败");
            setTimeout(() => setCopyStatus(""), 2000);
          });
      }
      
      // 清理创建的元素
      document.body.removeChild(textArea);
    } catch (err) {
      console.error("复制链接出错:", err);
      setCopyStatus("复制失败");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };
  
  const handleCopyContent = () => {
    try {
      // 检查内容是否为空
      if (!content || content.trim() === '') {
        setCopyStatus("内容为空，无法复制");
        setTimeout(() => setCopyStatus(""), 2000);
        return;
      }
      
      // 创建一个临时的文本区域元素
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';  // 避免滚动到底部
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // 尝试使用execCommand进行复制
      const successful = document.execCommand('copy');
      if (successful) {
        setCopyStatus("内容已复制");
        setTimeout(() => setCopyStatus(""), 2000);
      } else {
        // 如果execCommand失败，尝试使用Clipboard API
        navigator.clipboard.writeText(content)
          .then(() => {
            setCopyStatus("内容已复制");
            setTimeout(() => setCopyStatus(""), 2000);
          })
          .catch(err => {
            console.error("复制内容失败:", err);
            setCopyStatus("复制失败");
            setTimeout(() => setCopyStatus(""), 2000);
          });
      }
      
      // 清理创建的元素
      document.body.removeChild(textArea);
    } catch (err) {
      console.error("复制内容出错:", err);
      setCopyStatus("复制失败");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };
  
  // 创建一个防抖函数的帮助函数
  const useDebounce = <T,>(value: T, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    
    return debouncedValue;
  };
  
  // 使用防抖的密码
  const debouncedPassword = useDebounce(password, 500);
  
  // 密码变更时的处理函数
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errorMessage) setErrorMessage(null);
  }, [errorMessage]);

  // 在授权成功后添加到历史记录
  const recordToHistory = (clipboardData: any) => {
    if (clipboardData && clipboardData.content !== undefined) {
      addToHistory(
        id as string,
        clipboardData.content,
        clipboardData.isProtected,
        clipboardData.createdAt,
        clipboardData.expiresAt
      );
    }
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
        <header className="w-full p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-800 dark:text-white">
              云剪
            </Link>
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-center mb-4 text-gray-800 dark:text-white">
              此内容受密码保护
            </h2>
            
            {!isAuthorized && encryptedContent !== null && (
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg mt-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                  受密码保护的剪贴板
                </h2>
                
                <div className="mb-6">
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    请输入密码以查看此剪贴板内容。
                    {savedPassword && (
                      <span className="ml-1 text-green-600 dark:text-green-400">
                        提示: 您之前设置的密码已预填入输入框。
                      </span>
                    )}
                  </p>
                  
                  <div className="relative mb-4">
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onEnter={handleAuthorize}
                      placeholder="输入密码"
                      className={errorMessage ? "border-red-500 pr-12" : "pr-12"}
                    />
                  </div>
                
                  {errorMessage && (
                    <div className="text-red-500 text-sm mb-4">
                      {errorMessage}
                    </div>
                  )}
                  
                  {passwordBlocked ? (
                    <div className="text-red-500 mb-4">
                      密码输入次数过多，请等待 {blockTimeRemaining} 秒后再试。
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleAuthorize}
                        disabled={isLoading || !password}
                        className={`py-2 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:transform active:scale-95 text-white font-medium rounded-lg transition-all duration-150 flex items-center ${(isLoading || !password) ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            验证中...
                          </>
                        ) : (
                          "验证密码"
                        )}
                      </button>
                      
                      {remainingAttempts < 7 && (
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                          剩余尝试次数: {remainingAttempts}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  <p>此剪贴板的内容已使用密码加密，只有知道密码的人才能查看。</p>
                </div>
              </div>
            )}
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
            云剪
          </Link>
          
          <div className="flex items-center space-x-3">
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:transform active:scale-95 text-white text-sm font-medium rounded transition-all duration-150"
              >
                编辑
              </button>
            )}
            {editMode && (
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 active:transform active:scale-95 text-white text-sm font-medium rounded transition-all duration-150"
              >
                查看
              </button>
            )}
            <button
              onClick={handleCopyContent}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 active:transform active:scale-95 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-800 text-gray-800 dark:text-white text-sm font-medium rounded transition-all duration-150 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              复制内容
            </button>
            {copyStatus && (
              <div className="absolute top-16 right-4 sm:right-6 bg-green-100 text-green-800 px-3 py-1 rounded-md shadow-md dark:bg-green-800 dark:text-green-100 transition-opacity duration-300">
                {copyStatus}
              </div>
            )}
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
              <div className="w-full h-[calc(100vh-250px)] p-4 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-auto text-gray-800 dark:text-white">
                <ClipboardContent content={content} />
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
                  <p className={`${isExpired(expiresAt) ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                    {isExpired(expiresAt) ? (
                      '已过期'
                    ) : (
                      <>
                        <span>{formatExpirationTime(expiresAt)}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatChinaTime(expiresAt)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              )}
              
              <div className="pt-2">
                <button
                  onClick={handleCopyUrl}
                  className="w-full py-2 px-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 active:transform active:scale-95 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-800 text-gray-800 dark:text-white text-sm font-medium rounded transition-all duration-150 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
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
              {/* 使用动态导入的QR码组件 */}
              <QRCodeComponent url={clipboardUrl} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 