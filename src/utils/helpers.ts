/**
 * 生成唯一ID，用于剪贴板路径
 * @returns 生成的唯一ID
 */
export function generateUniqueId(): string {
  // 生成随机字符串
  const randomPart = Math.random().toString(36).substring(2, 10);
  // 添加时间戳以确保唯一性
  const timestampPart = Date.now().toString(36);
  return `${randomPart}-${timestampPart}`;
}

/**
 * 获取当前中国时区的时间戳（毫秒）
 * @returns 当前中国时区的时间戳
 */
export function getChinaTimeMs(): number {
  return Date.now();
}

/**
 * 将时间戳格式化为中国时区的时间字符串
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化的时间字符串，如"2023年4月1日 15:30:45"
 */
export function formatChinaTime(timestamp: number): string {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai'
  };
  
  return new Date(timestamp).toLocaleString('zh-CN', options);
}

/**
 * 将时间戳格式化为简短的中国时区时间字符串
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化的简短时间字符串，如"2023-04-01 15:30"
 */
export function formatShortChinaTime(timestamp: number): string {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai'
  };
  
  return new Date(timestamp).toLocaleString('zh-CN', options).replace(/\//g, '-');
}

/**
 * 检查Web Crypto API是否可用
 * @returns Web Crypto API是否可用
 */
export function isCryptoAvailable(): boolean {
  return typeof window !== 'undefined' && 
         !!window.crypto && 
         !!window.crypto.subtle;
}

/**
 * 简单的加密方法 (不安全，仅作为备用)
 * @param text 要加密的文本
 * @param password 加密密码
 * @returns 加密后的文本
 */
function simpleEncrypt(text: string, password: string): string {
  // 一个非常简单的XOR加密，仅作为备用，不推荐用于敏感数据
  const result = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ password.charCodeAt(i % password.length);
    result.push(String.fromCharCode(charCode));
  }
  // 添加一个标记表示这是简单加密
  return 'SIMPLE:' + btoa(result.join(''));
}

/**
 * 简单的解密方法 (配合simpleEncrypt使用)
 * @param encryptedText 加密的文本
 * @param password 解密密码
 * @returns 解密后的文本
 */
function simpleDecrypt(encryptedText: string, password: string): string {
  // 移除标记并解码
  const base64 = encryptedText.substring(7);
  const encoded = atob(base64);
  
  const result = [];
  for (let i = 0; i < encoded.length; i++) {
    const charCode = encoded.charCodeAt(i) ^ password.charCodeAt(i % password.length);
    result.push(String.fromCharCode(charCode));
  }
  return result.join('');
}

/**
 * 加密文本内容
 * @param text 要加密的文本
 * @param password 加密密码
 * @returns 加密后的文本
 */
export async function encryptText(text: string, password: string): Promise<string> {
  try {
    // 检查参数有效性
    if (!text || !password) {
      console.error('加密失败: 文本或密码为空');
      throw new Error('加密失败: 文本或密码为空');
    }
    
    // 检查是否可以使用Web Crypto API
    if (!isCryptoAvailable()) {
      console.warn('Web Crypto API不可用，使用简单加密方法（不安全）');
      return simpleEncrypt(text, password);
    }
    
    try {
      // 将密码字符串转换为加密密钥
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const keyData = await window.crypto.subtle.digest('SHA-256', passwordData);
      
      // 创建加密密钥
      const key = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // 创建初始化向量
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // 加密数据
      const textData = encoder.encode(text);
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        textData
      );
      
      // 将IV和加密数据组合在一起
      const result = new Uint8Array(iv.length + encryptedData.byteLength);
      result.set(iv, 0);
      result.set(new Uint8Array(encryptedData), iv.length);
      
      // 添加前缀标识这是使用Web Crypto API加密的
      return 'CRYPTO:' + btoa(String.fromCharCode(...result));
    } catch (cryptoError) {
      console.error('Web Crypto API操作失败:', cryptoError);
      console.warn('回退到简单加密方法（不安全）');
      return simpleEncrypt(text, password);
    }
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('加密失败');
  }
}

/**
 * 解密文本内容
 * @param encryptedText 加密的文本
 * @param password 解密密码
 * @returns 解密后的文本
 */
export async function decryptText(encryptedText: string, password: string): Promise<string> {
  try {
    // 检查参数有效性
    if (!encryptedText || !password) {
      console.error('解密失败: 加密文本或密码为空');
      throw new Error('解密失败: 加密文本或密码为空');
    }
    
    // 检查加密类型
    if (encryptedText.startsWith('SIMPLE:')) {
      console.log('检测到简单加密内容，使用简单解密方法');
      return simpleDecrypt(encryptedText, password);
    }
    
    // 如果是Web Crypto加密的内容但API不可用
    if (encryptedText.startsWith('CRYPTO:') && !isCryptoAvailable()) {
      console.error('解密失败: 内容需要Web Crypto API解密，但当前环境不支持');
      throw new Error('解密失败: 当前浏览器不支持Web Crypto API');
    }
    
    // 移除前缀（如果有）
    if (encryptedText.startsWith('CRYPTO:')) {
      encryptedText = encryptedText.substring(7);
    }
    
    try {
      // 将Base64字符串转换回二进制数据
      const encryptedData = new Uint8Array(
        atob(encryptedText).split('').map(char => char.charCodeAt(0))
      );
      
      // 提取IV和加密数据
      const iv = encryptedData.slice(0, 12);
      const data = encryptedData.slice(12);
      
      // 从密码生成密钥
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const keyData = await window.crypto.subtle.digest('SHA-256', passwordData);
      
      // 创建解密密钥
      const key = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // 解密数据
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        data
      );
      
      // 转换为文本
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (cryptoError) {
      console.error('Web Crypto API操作失败:', cryptoError);
      throw new Error('解密失败，请检查密码是否正确');
    }
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败，请检查密码是否正确');
  }
}

/**
 * 计算过期时间
 * @param hours 小时数
 * @param createdAt 创建时间（可选），如果不提供则使用当前时间
 * @returns 过期的时间戳（毫秒）
 */
export function calculateExpirationTime(hours: number, createdAt?: number): number {
  // 使用创建时间或当前时间作为基准
  const baseTime = createdAt || Date.now();
  const millisecondsToExpire = Math.floor(hours * 3600 * 1000); // 每小时3600秒，每秒1000毫秒
  const expiresAt = baseTime + millisecondsToExpire;
  
  console.log(`[calculateExpirationTime] 基准时间: ${formatChinaTime(baseTime)}`);
  console.log(`[calculateExpirationTime] 过期时间: ${formatChinaTime(expiresAt)}`);
  console.log(`[calculateExpirationTime] 设置过期时间: ${hours}小时，共${millisecondsToExpire}毫秒`);
  
  return expiresAt;
}

/**
 * 检查内容是否已过期
 * @param expirationTime 过期时间戳
 * @returns 是否已过期
 */
export function isExpired(expirationTime: number): boolean {
  return Date.now() > expirationTime;
}

/**
 * 格式化过期时间为可读形式
 * @param expirationTime 过期时间戳
 * @returns 格式化的过期时间字符串
 */
export function formatExpirationTime(expirationTime: number): string {
  const now = Date.now();
  const diff = expirationTime - now;
  
  if (diff <= 0) {
    return '已过期';
  }
  
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟后过期`;
  } else {
    return `${minutes}分钟后过期`;
  }
}

/**
 * 生成二维码的URL
 * @param url 要编码为二维码的URL
 * @param size 二维码的大小（像素）
 * @param light 背景色，十六进制颜色代码
 * @param dark 前景色，十六进制颜色代码
 * @returns 生成二维码的URL
 */
export function generateQRCodeUrl(
  url: string, 
  size: number = 200, 
  light: string = '#ffffff', 
  dark: string = '#000000'
): string {
  try {
    const params = new URLSearchParams({
      data: url,
      size: size.toString(),
      light,
      dark
    });
    return `/api/qrcode?${params.toString()}`;
  } catch (error) {
    console.error('生成二维码URL失败:', error);
    return '';
  }
} 