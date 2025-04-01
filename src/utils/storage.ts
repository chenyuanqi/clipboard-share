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
 * @param createdAt 创建时间（可选），如果不提供则使用当前时间
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
    console.log(`【详细日志】- expirationHours = ${expirationHours}`);
    console.log(`【详细日志】- createdAt = ${createdAt ? new Date(createdAt).toLocaleString() : '未提供'}`);
    
    // 确保isProtected参数正确转换为布尔值
    const protectedStatus = Boolean(isProtected);
    
    // 获取当前时间作为创建时间，或使用传入的创建时间
    const actualCreatedAt = createdAt || Date.now();
    
    // 基于创建时间计算过期时间
    const expiresAt = calculateExpirationTime(expirationHours, actualCreatedAt);
    
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
      lastModified: Date.now()
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

// 初始化：每次加载时清理过期剪贴板
if (typeof window !== 'undefined') {
  cleanupExpiredClipboards();
} 