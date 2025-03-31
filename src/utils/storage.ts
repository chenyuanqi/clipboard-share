import { isExpired, calculateExpirationTime } from './helpers';

// 剪贴板数据接口
export interface ClipboardData {
  id: string;
  content: string;
  isProtected: boolean;
  createdAt: number;
  expiresAt: number;
  lastModified: number;
}

// 本地存储键
const CLIPBOARD_STORAGE_KEY = 'clipboard-share-data';
const CLIPBOARD_PASSWORDS_KEY = 'clipboard-share-passwords';

/**
 * 获取所有剪贴板数据
 * @returns 剪贴板数据映射
 */
export function getAllClipboards(): Record<string, ClipboardData> {
  try {
    const data = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
    if (!data) return {};
    return JSON.parse(data) as Record<string, ClipboardData>;
  } catch (error) {
    console.error('获取剪贴板数据失败:', error);
    return {};
  }
}

/**
 * 保存所有剪贴板数据
 * @param clipboards 剪贴板数据映射
 */
function saveAllClipboards(clipboards: Record<string, ClipboardData>): void {
  try {
    localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(clipboards));
  } catch (error) {
    console.error('保存剪贴板数据失败:', error);
  }
}

/**
 * 获取单个剪贴板数据
 * @param id 剪贴板ID
 * @returns 剪贴板数据，如不存在则返回null
 */
export function getClipboard(id: string): ClipboardData | null {
  const clipboards = getAllClipboards();
  const clipboard = clipboards[id];
  
  if (!clipboard) return null;
  
  // 检查是否过期
  if (isExpired(clipboard.expiresAt)) {
    // 如果过期，删除并返回null
    deleteClipboard(id);
    return null;
  }
  
  return clipboard;
}

/**
 * 创建新的剪贴板
 * @param id 剪贴板ID
 * @param content 初始内容
 * @param isProtected 是否密码保护
 * @param expirationHours 过期小时数
 * @returns 新创建的剪贴板数据
 */
export function createClipboard(
  id: string,
  content: string = '',
  isProtected: boolean = false,
  expirationHours: number = 1
): ClipboardData {
  const now = Date.now();
  const expiresAt = calculateExpirationTime(expirationHours);
  
  const newClipboard: ClipboardData = {
    id,
    content,
    isProtected,
    createdAt: now,
    expiresAt,
    lastModified: now,
  };
  
  const clipboards = getAllClipboards();
  clipboards[id] = newClipboard;
  saveAllClipboards(clipboards);
  
  return newClipboard;
}

/**
 * 更新剪贴板内容
 * @param id 剪贴板ID
 * @param content 新内容
 * @returns 更新后的剪贴板数据，如不存在则返回null
 */
export function updateClipboardContent(id: string, content: string): ClipboardData | null {
  const clipboards = getAllClipboards();
  const clipboard = clipboards[id];
  
  if (!clipboard || isExpired(clipboard.expiresAt)) {
    return null;
  }
  
  clipboard.content = content;
  clipboard.lastModified = Date.now();
  
  clipboards[id] = clipboard;
  saveAllClipboards(clipboards);
  
  return clipboard;
}

/**
 * 删除剪贴板
 * @param id 剪贴板ID
 * @returns 是否成功删除
 */
export function deleteClipboard(id: string): boolean {
  const clipboards = getAllClipboards();
  
  if (!clipboards[id]) {
    return false;
  }
  
  delete clipboards[id];
  saveAllClipboards(clipboards);
  
  // 同时删除关联的密码
  removeClipboardPassword(id);
  
  return true;
}

/**
 * 清理过期的剪贴板
 * @returns 清理的剪贴板数量
 */
export function cleanupExpiredClipboards(): number {
  const clipboards = getAllClipboards();
  let count = 0;
  
  for (const id in clipboards) {
    if (isExpired(clipboards[id].expiresAt)) {
      delete clipboards[id];
      removeClipboardPassword(id);
      count++;
    }
  }
  
  if (count > 0) {
    saveAllClipboards(clipboards);
  }
  
  return count;
}

// 密码管理

/**
 * 获取所有剪贴板密码
 * @returns 剪贴板ID到密码的映射
 */
function getAllPasswords(): Record<string, string> {
  try {
    const data = localStorage.getItem(CLIPBOARD_PASSWORDS_KEY);
    if (!data) return {};
    return JSON.parse(data) as Record<string, string>;
  } catch (error) {
    console.error('获取密码失败:', error);
    return {};
  }
}

/**
 * 保存所有剪贴板密码
 * @param passwords 剪贴板ID到密码的映射
 */
function saveAllPasswords(passwords: Record<string, string>): void {
  try {
    localStorage.setItem(CLIPBOARD_PASSWORDS_KEY, JSON.stringify(passwords));
  } catch (error) {
    console.error('保存密码失败:', error);
  }
}

/**
 * 保存剪贴板密码
 * @param id 剪贴板ID
 * @param password 密码
 */
export function saveClipboardPassword(id: string, password: string): void {
  const passwords = getAllPasswords();
  passwords[id] = password;
  saveAllPasswords(passwords);
}

/**
 * 获取剪贴板密码
 * @param id 剪贴板ID
 * @returns 密码，如不存在则返回null
 */
export function getClipboardPassword(id: string): string | null {
  const passwords = getAllPasswords();
  return passwords[id] || null;
}

/**
 * 移除剪贴板密码
 * @param id 剪贴板ID
 */
export function removeClipboardPassword(id: string): void {
  const passwords = getAllPasswords();
  if (passwords[id]) {
    delete passwords[id];
    saveAllPasswords(passwords);
  }
}

// 初始化：每次加载时清理过期剪贴板
if (typeof window !== 'undefined') {
  cleanupExpiredClipboards();
} 