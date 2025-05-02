import { isExpired, calculateExpirationTime } from './helpers';
import { formatChinaTime, getChinaTimeMs } from "./helpers";

// 剪贴板数据接口
export interface ClipboardData {
  id: string;
  content: string;
  isProtected: boolean;
  createdAt: number;
  expiresAt: number;
  lastModified: number;
}

// 历史记录相关
export interface ClipboardHistoryItem {
  id: string;
  title: string; // 显示的标题（取内容前部分）
  content: string; // 内容摘要
  isProtected: boolean; // 是否有密码保护
  visitedAt: number; // 最后访问时间
  createdAt: number; // 创建时间
  expiresAt: number; // 过期时间
}

// 本地存储键
const CLIPBOARD_STORAGE_KEY = 'clipboard-share-data';
const CLIPBOARD_PASSWORDS_KEY = 'clipboard-share-passwords';
const CLIPBOARD_HISTORY_KEY = 'clipboard-share-history';

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
 * @param expirationHours 过期小时数（可以是小数，如0.0833表示5分钟，0.5表示30分钟）
 * @param createdAt 创建时间（可选），如果不提供则使用当前中国时区时间
 * @returns 新创建的剪贴板数据
 */
export function createClipboard(
  id: string,
  content: string = '',
  isProtected: boolean = false,
  expirationHours: number = 24,
  createdAt?: number
): ClipboardData {
  try {
    console.log(`【详细日志】createClipboard函数被调用:`);
    console.log(`【详细日志】- id = ${id}`);
    console.log(`【详细日志】- content长度 = ${content.length}字符`);
    console.log(`【详细日志】- isProtected = ${isProtected} (${typeof isProtected})`);
    console.log(`【详细日志】- isProtected详细检查 = ${JSON.stringify({
      "isProtected === true": isProtected === true,
      "isProtected === false": isProtected === false,
      "typeof isProtected": typeof isProtected,
      "Boolean(isProtected)": Boolean(isProtected),
      "!!isProtected": !!isProtected
    })}`);
    
    // 计算分钟数，用于日志显示
    const minutes = Math.floor(expirationHours * 60);
    
    if (expirationHours >= 1) {
      console.log(`【详细日志】- expirationHours = ${expirationHours}小时 (${minutes}分钟)`);
    } else {
      console.log(`【详细日志】- expirationHours = ${minutes}分钟`);
    }
    
    // 确保isProtected参数正确转换为布尔值
    const protectedStatus = Boolean(isProtected);
    
    // 获取当前中国时区时间作为创建时间，或使用传入的创建时间
    const actualCreatedAt = createdAt || getChinaTimeMs();
    console.log(`【详细日志】- 创建时间(中国时区): ${formatChinaTime(actualCreatedAt)} (${actualCreatedAt})`);
    
    // 基于创建时间计算过期时间
    const expiresAt = calculateExpirationTime(expirationHours, actualCreatedAt);
    console.log(`【详细日志】- 过期时间(中国时区): ${formatChinaTime(expiresAt)} (${expiresAt})`);
    
    const clipboard: ClipboardData = {
      id,
      content,
      isProtected: protectedStatus,
      createdAt: actualCreatedAt,
      expiresAt,
      lastModified: actualCreatedAt
    };
    
    // 保存到本地存储
    try {
      const clipboards = getAllClipboards();
      clipboards[id] = clipboard;
      saveAllClipboards(clipboards);
      console.log(`创建剪贴板成功: ID=${id}, 创建时间=${new Date(actualCreatedAt).toLocaleString()}, 过期时间=${new Date(expiresAt).toLocaleString()}`);
    } catch (error) {
      console.error('保存剪贴板失败:', error);
    }
    
    // 同时保存到localStorage作为备份
    try {
      localStorage.setItem(`clipboard-${id}`, JSON.stringify(clipboard));
    } catch (error) {
      console.error('保存剪贴板到localStorage失败:', error);
    }
    
    // 返回前记录最终结果
    console.log(`【详细日志】createClipboard返回结果:`);
    console.log(`【详细日志】- id = ${clipboard.id}`);
    console.log(`【详细日志】- isProtected = ${clipboard.isProtected} (${typeof clipboard.isProtected})`);
    console.log(`【详细日志】- createdAt = ${new Date(clipboard.createdAt).toLocaleString()}`);
    console.log(`【详细日志】- expiresAt = ${new Date(clipboard.expiresAt).toLocaleString()}`);
    
    return clipboard;
  } catch (error) {
    console.error('创建剪贴板出错:', error);
    throw error;
  }
}

/**
 * 更新剪贴板内容
 * @param id 剪贴板ID
 * @param content 新内容
 * @returns 更新后的剪贴板数据，如不存在则返回null
 */
export function updateClipboardContent(id: string, content: string): ClipboardData | null {
  try {
    // 获取现有剪贴板数据
    const clipboard = getClipboard(id);
    if (!clipboard) {
      console.error(`更新内容失败: ID=${id} 的剪贴板不存在`);
      return null;
    }
    
    // 更新内容和最后修改时间，但保持创建时间和过期时间不变
    const updatedClipboard: ClipboardData = {
      ...clipboard,
      content,
      lastModified: getChinaTimeMs()
    };
    
    // 保存到localStorage
    try {
      const clipboards = getAllClipboards();
      clipboards[id] = updatedClipboard;
      saveAllClipboards(clipboards);
      console.log(`更新剪贴板内容成功: ID=${id}`);
    } catch (error) {
      console.error('保存更新后的剪贴板失败:', error);
      return null;
    }
    
    // 同时更新备份存储
    try {
      localStorage.setItem(`clipboard-${id}`, JSON.stringify(updatedClipboard));
    } catch (error) {
      console.error('更新备份存储失败:', error);
    }
    
    return updatedClipboard;
  } catch (error) {
    console.error('更新剪贴板内容出错:', error);
    return null;
  }
}

/**
 * 删除剪贴板
 * @param id 剪贴板ID
 * @returns 是否成功
 */
export function deleteClipboard(id: string): boolean {
  try {
    // 从历史记录中删除
    const historyData = getClipboardHistory();
    const updatedHistory = historyData.filter(item => item.id !== id);
    setClipboardHistory(updatedHistory);
    
    // 从Map中删除
    const clipboardData = getAllClipboards();
    delete clipboardData[id];
    localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(clipboardData));
    
    console.log(`剪贴板 ${id} 已从本地存储中删除`);
    
    // 同时清理该ID的密码和备份
    try {
      // 清理密码
      const pwdKey = `${CLIPBOARD_PASSWORDS_KEY}-${id}`;
      if (localStorage.getItem(pwdKey)) {
        localStorage.removeItem(pwdKey);
        console.log(`已删除密码: ${pwdKey}`);
      }
      
      // 清理备份
      const backupKeys = [
        `clipboard-content-${id}`,
        `clipboard-content-backup-${id}`,
        `clipboard-${id}`,
        `clipboard-pwd-${id}`
      ];
      
      backupKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`已删除备份: ${key}`);
        }
      });
    } catch (error) {
      console.error('删除备份失败:', error);
    }
    
    return true;
  } catch (error) {
    console.error(`删除剪贴板 ${id} 失败:`, error);
    return false;
  }
}

/**
 * 清理过期的剪贴板
 * @returns 清理的剪贴板数量
 */
export function cleanupExpiredClipboards(): number {
  const clipboards = getAllClipboards();
  let count = 0;
  
  const now = getChinaTimeMs();
  console.log(`[cleanupExpiredClipboards] 开始检查过期剪贴板，当前中国时间: ${formatChinaTime(now)} (${now})`);
  
  for (const id in clipboards) {
    const clipboard = clipboards[id];
    const isExp = isExpired(clipboard.expiresAt);
    
    console.log(`[cleanupExpiredClipboards] 检查ID=${id}, 过期时间: ${formatChinaTime(clipboard.expiresAt)} (${clipboard.expiresAt}), 是否过期: ${isExp}`);
    
    if (isExp) {
      delete clipboards[id];
      removeClipboardPassword(id);
      count++;
      console.log(`[cleanupExpiredClipboards] 删除过期剪贴板: ID=${id}`);
    }
  }
  
  if (count > 0) {
    saveAllClipboards(clipboards);
    console.log(`[cleanupExpiredClipboards] 共删除${count}个过期剪贴板`);
  } else {
    console.log(`[cleanupExpiredClipboards] 没有找到过期剪贴板`);
  }
  
  return count;
}

// 密码管理

/**
 * 获取所有剪贴板密码
 * @returns 剪贴板ID到密码的映射
 */
function getAllPasswords(): Record<string, string> {
  if (typeof window === 'undefined') {
    console.error('getAllPasswords被在服务器端调用，这是不允许的');
    return {};
  }
  
  try {
    const data = localStorage.getItem(CLIPBOARD_PASSWORDS_KEY);
    console.log(`读取所有密码数据: ${data ? '成功' : '无数据'}`);
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
  if (typeof window === 'undefined') {
    console.error('saveAllPasswords被在服务器端调用，这是不允许的');
    return;
  }
  
  try {
    const jsonData = JSON.stringify(passwords);
    console.log(`准备保存密码数据，长度: ${jsonData.length}字符`);
    localStorage.setItem(CLIPBOARD_PASSWORDS_KEY, jsonData);
    
    // 验证保存是否成功
    const savedData = localStorage.getItem(CLIPBOARD_PASSWORDS_KEY);
    if (savedData !== jsonData) {
      console.error('密码保存验证失败，数据不匹配');
    } else {
      console.log('密码数据保存成功并已验证');
    }
  } catch (error) {
    console.error('保存密码失败:', error);
  }
}

/**
 * 保存剪贴板密码
 * @param id 剪贴板ID
 * @param password 密码
 */
export function saveClipboardPassword(id: string, password: string): boolean {
  if (typeof window === 'undefined') {
    console.error('saveClipboardPassword被在服务器端调用，这是不允许的');
    return false;
  }
  
  if (!id || typeof id !== 'string') {
    console.error('保存密码失败: ID无效', id);
    return false;
  }
  
  if (!password || typeof password !== 'string') {
    console.error('保存密码失败: 密码无效', password);
    return false;
  }
  
  try {
    console.log(`准备为剪贴板 ${id} 保存密码`, password);
    const passwords = getAllPasswords();
    passwords[id] = password;
    saveAllPasswords(passwords);
    
    // 验证保存是否成功
    const savedPassword = getClipboardPassword(id);
    if (savedPassword !== password) {
      console.error(`密码保存验证失败: 期望=${password}, 实际=${savedPassword}`);
      return false;
    }
    
    console.log(`剪贴板 ${id} 密码保存成功并已验证`);
    return true;
  } catch (error) {
    console.error(`保存密码失败 (ID=${id}):`, error);
    return false;
  }
}

/**
 * 获取剪贴板密码
 * @param id 剪贴板ID
 * @returns 密码，如不存在则返回null
 */
export function getClipboardPassword(id: string): string | null {
  if (typeof window === 'undefined') {
    console.error('getClipboardPassword被在服务器端调用，这是不允许的');
    return null;
  }
  
  try {
    const passwords = getAllPasswords();
    const password = passwords[id] || null;
    console.log(`获取剪贴板 ${id} 密码: ${password ? '成功' : '未找到'}`);
    return password;
  } catch (error) {
    console.error(`获取密码失败 (ID=${id}):`, error);
    return null;
  }
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

// 历史记录相关

/**
 * 保存剪贴板历史记录
 * @param history 历史记录列表
 */
function setClipboardHistory(history: ClipboardHistoryItem[]): void {
  try {
    localStorage.setItem(CLIPBOARD_HISTORY_KEY, JSON.stringify(history));
    console.log(`保存剪贴板历史记录成功，共 ${history.length} 条记录`);
  } catch (error) {
    console.error('保存剪贴板历史记录失败:', error);
  }
}

/**
 * 添加剪贴板访问历史记录
 * @param id 剪贴板ID
 * @param content 内容
 * @param isProtected 是否受密码保护
 * @param createdAt 创建时间（中国时区）
 * @param expiresAt 过期时间（中国时区）
 */
export function addToHistory(
  id: string,
  content: string,
  isProtected: boolean = false,
  createdAt: number = getChinaTimeMs(),
  expiresAt: number = getChinaTimeMs() + 24 * 60 * 60 * 1000
): void {
  try {
    // 获取现有历史记录
    const history = getClipboardHistory();
    
    // 生成标题（使用内容前 30 个字符，去除换行）
    let title = content.trim().replace(/\n/g, ' ').substring(0, 30);
    if (title.length === 0) {
      title = `剪贴板 ${id}`;
    } else if (content.length > 30) {
      title += '...';
    }
    
    // 生成摘要内容（使用内容前 100 个字符）
    let summary = content.trim().substring(0, 100);
    if (content.length > 100) {
      summary += '...';
    }
    
    // 更新或添加历史记录
    const now = getChinaTimeMs();
    
    console.log(`[addToHistory] 添加历史记录: ID=${id}`);
    console.log(`[addToHistory] 当前中国时间: ${formatChinaTime(now)} (${now})`);
    console.log(`[addToHistory] 创建时间: ${formatChinaTime(createdAt)} (${createdAt})`);
    console.log(`[addToHistory] 过期时间: ${formatChinaTime(expiresAt)} (${expiresAt})`);
    
    const existingIndex = history.findIndex(item => item.id === id);
    
    const historyItem: ClipboardHistoryItem = {
      id,
      title,
      content: summary,
      isProtected,
      visitedAt: now,
      createdAt,
      expiresAt
    };
    
    if (existingIndex !== -1) {
      // 更新现有记录的访问时间和内容
      history[existingIndex] = historyItem;
    } else {
      // 添加新记录
      history.unshift(historyItem);
      
      // 如果历史记录超过50条，删除最旧的
      if (history.length > 50) {
        history.pop();
      }
    }
    
    // 保存更新后的历史记录
    setClipboardHistory(history);
    console.log(`添加/更新剪贴板历史记录: ID=${id}`);
  } catch (error) {
    console.error('添加剪贴板历史记录失败:', error);
  }
}

/**
 * 获取所有剪贴板历史记录，按访问时间倒序排列
 * @returns 历史记录列表
 */
export function getClipboardHistory(): ClipboardHistoryItem[] {
  try {
    const data = localStorage.getItem(CLIPBOARD_HISTORY_KEY);
    if (!data) return [];
    
    const history = JSON.parse(data) as ClipboardHistoryItem[];
    
    // 使用中国时区时间清理已过期的记录
    const now = getChinaTimeMs();
    const validHistory = history.filter(item => item.expiresAt > now);
    
    // 如果有过期记录被过滤掉，重新保存历史记录
    if (validHistory.length < history.length) {
      setClipboardHistory(validHistory);
      console.log(`清理了 ${history.length - validHistory.length} 条过期的历史记录，当前中国时间: ${formatChinaTime(now)}`);
    }
    
    // 按访问时间倒序排序
    return validHistory.sort((a, b) => b.visitedAt - a.visitedAt);
  } catch (error) {
    console.error('获取剪贴板历史记录失败:', error);
    return [];
  }
}

/**
 * 清空所有历史记录
 */
export function clearClipboardHistory(): void {
  try {
    localStorage.removeItem(CLIPBOARD_HISTORY_KEY);
    console.log('清空剪贴板历史记录成功');
  } catch (error) {
    console.error('清空剪贴板历史记录失败:', error);
  }
}

/**
 * 从历史记录中删除特定ID
 * @param id 要删除的剪贴板ID
 */
export function removeFromHistory(id: string): void {
  try {
    const history = getClipboardHistory();
    const filteredHistory = history.filter(item => item.id !== id);
    
    if (filteredHistory.length < history.length) {
      setClipboardHistory(filteredHistory);
      console.log(`从历史记录中删除 ID=${id} 成功`);
    }
  } catch (error) {
    console.error('从历史记录中删除项目失败:', error);
  }
}

// 初始化：每次加载时清理过期剪贴板
if (typeof window !== 'undefined') {
  cleanupExpiredClipboards();
} 