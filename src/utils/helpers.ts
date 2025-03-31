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
 * 加密文本内容
 * @param text 要加密的文本
 * @param password 加密密码
 * @returns 加密后的文本
 */
export async function encryptText(text: string, password: string): Promise<string> {
  try {
    // 将密码字符串转换为加密密钥
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const keyData = await crypto.subtle.digest('SHA-256', passwordData);
    
    // 创建加密密钥
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // 创建初始化向量
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 加密数据
    const textData = encoder.encode(text);
    const encryptedData = await crypto.subtle.encrypt(
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
    
    // 转换为Base64字符串
    return btoa(String.fromCharCode(...result));
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
    const keyData = await crypto.subtle.digest('SHA-256', passwordData);
    
    // 创建解密密钥
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // 解密数据
    const decryptedData = await crypto.subtle.decrypt(
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
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败，请检查密码是否正确');
  }
}

/**
 * 计算过期时间
 * @param hours 小时数
 * @returns 过期的时间戳（毫秒）
 */
export function calculateExpirationTime(hours: number): number {
  return Date.now() + hours * 60 * 60 * 1000;
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
 * @returns 生成二维码的URL
 */
export function generateQRCodeUrl(url: string, size: number = 200): string {
  try {
    // 这里我们返回一个占位符。实际的QR码将在客户端动态生成
    return `/api/qrcode?data=${encodeURIComponent(url)}&size=${size}`;
  } catch (error) {
    console.error('生成二维码URL失败:', error);
    return '';
  }
} 