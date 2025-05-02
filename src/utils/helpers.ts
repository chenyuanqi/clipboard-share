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
 * 获取当前中国时区（UTC+8）的时间戳（毫秒）
 * @returns 中国时区的当前时间戳
 */
export function getChinaTimeMs(): number {
  // 方法1：使用标准的Date对象方法
  // 获取当前UTC时间毫秒数
  const now = new Date();
  
  // 创建一个表示中国时间的日期对象
  const options: Intl.DateTimeFormatOptions = { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  };
  
  // 格式化为中国时区的日期字符串
  const chinaTimeStr = now.toLocaleString('zh-CN', options);
  
  // 将格式化的字符串解析回Date对象
  // 格式通常为：2023/5/8 14:30:45
  const [datePart, timePart] = chinaTimeStr.split(' ');
  const [year, month, day] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  
  // 注意：月份需要减1，因为Date对象的月份是从0开始计数的
  const chinaDate = new Date(year, month - 1, day, hour, minute, second);
  
  console.log(`[getChinaTimeMs] 当前中国时间: ${chinaTimeStr} => ${chinaDate.toISOString()} (${chinaDate.getTime()})`);
  
  return chinaDate.getTime();
}

/**
 * 将任何时间戳转换为中国时区的时间戳
 * @param timestamp UTC时间戳
 * @returns 转换为中国时区的时间戳
 */
export function convertToChinaTime(timestamp: number): number {
  // 创建一个表示给定时间戳的Date对象
  const date = new Date(timestamp);
  
  // 获取其在中国时区的表示
  const options: Intl.DateTimeFormatOptions = { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    // 为了更高精度，添加毫秒
    fractionalSecondDigits: 3
  };
  
  // 格式化为中国时区的日期字符串
  const chinaTimeStr = date.toLocaleString('zh-CN', options);
  
  // 处理格式化字符串，包括毫秒（如果有）
  const [datePart, timeWithMs] = chinaTimeStr.split(' ');
  
  // 分割时间部分和毫秒部分
  let timePart, msPart = 0;
  if (timeWithMs.includes('.')) {
    const [time, ms] = timeWithMs.split('.');
    timePart = time;
    msPart = parseInt(ms);
  } else {
    timePart = timeWithMs;
  }
  
  // 解析日期和时间
  const [year, month, day] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  
  // 创建中国时区的日期对象
  const chinaDate = new Date(year, month - 1, day, hour, minute, second, msPart);
  
  console.log(`[convertToChinaTime] 输入时间戳: ${timestamp} => ${date.toISOString()}`);
  console.log(`[convertToChinaTime] 中国时间: ${chinaTimeStr} => ${chinaDate.toISOString()} (${chinaDate.getTime()})`);
  
  return chinaDate.getTime();
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
  
  try {
    // 添加一个标记表示这是简单加密
    // 使用encodeURIComponent先对结果进行编码，避免非ASCII字符的问题
    return 'SIMPLE:' + btoa(encodeURIComponent(result.join('')));
  } catch (error) {
    console.error('简单加密过程中的编码错误:', error);
    // 如果还是失败，尝试直接使用原始文本的UTF-8编码
    return 'SIMPLE-UTF8:' + btoa(encodeURIComponent(text));
  }
}

/**
 * 简单的解密方法 (配合simpleEncrypt使用)
 * @param encryptedText 加密的文本
 * @param password 解密密码
 * @returns 解密后的文本
 */
function simpleDecrypt(encryptedText: string, password: string): string {
  try {
    // 判断加密类型
    if (encryptedText.startsWith('SIMPLE-UTF8:')) {
      // 如果是直接使用原始文本UTF-8编码的情况
      const base64 = encryptedText.substring(12); // 去掉'SIMPLE-UTF8:'前缀
      try {
        const decodedText = decodeURIComponent(atob(base64));
        return decodedText;
      } catch (error) {
        console.error('UTF8模式解密失败:', error);
        throw new Error('解密失败: 无法解析UTF8编码内容');
      }
    } else {
      // 标准SIMPLE格式
      // 移除标记并解码
      const base64 = encryptedText.substring(7); // 去掉'SIMPLE:'前缀
      const encoded = decodeURIComponent(atob(base64));
      
      const result = [];
      for (let i = 0; i < encoded.length; i++) {
        const charCode = encoded.charCodeAt(i) ^ password.charCodeAt(i % password.length);
        result.push(String.fromCharCode(charCode));
      }
      return result.join('');
    }
  } catch (error) {
    console.error('简单解密失败:', error);
    throw new Error('解密失败: 格式错误或内容已损坏');
  }
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
      try {
        return simpleEncrypt(text, password);
      } catch (error) {
        console.error('简单加密失败:', error);
        // 使用最基本的URI编码作为最终回退方案
        return 'SIMPLE-UTF8:' + btoa(encodeURIComponent(text));
      }
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
      try {
        return simpleEncrypt(text, password);
      } catch (fallbackError) {
        console.error('简单加密回退也失败:', fallbackError);
        // 使用最基本的URI编码作为最终回退方案
        return 'SIMPLE-UTF8:' + btoa(encodeURIComponent(text));
      }
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
    
    console.log(`开始解密过程，内容类型: ${encryptedText.substring(0, 8)}...`);
    
    // 检查加密类型
    if (encryptedText.startsWith('SIMPLE:') || encryptedText.startsWith('SIMPLE-UTF8:')) {
      console.log(`检测到简单加密内容，使用简单解密方法 (格式: ${encryptedText.substring(0, encryptedText.indexOf(':') + 1)})`);
      return simpleDecrypt(encryptedText, password);
    }
    
    // 如果是Web Crypto加密的内容但API不可用
    if (encryptedText.startsWith('CRYPTO:')) {
      if (!isCryptoAvailable()) {
        console.error('解密失败: 内容需要Web Crypto API解密，但当前环境不支持');
        console.log('尝试使用备用简单解密方法');
        
        try {
          // 尝试使用简单解密方法作为备用
          // 首先移除CRYPTO:前缀
          const simplifiedText = 'SIMPLE:' + encryptedText.substring(7);
          return simpleDecrypt(simplifiedText, password);
        } catch (fallbackError) {
          console.error('备用解密也失败:', fallbackError);
          throw new Error('解密失败: 当前浏览器不支持Web Crypto API，且备用解密也失败');
        }
      }
      
      // 移除前缀
      encryptedText = encryptedText.substring(7);
    }
    
    try {
      // 对Base64解码添加错误处理
      let decodedData;
      try {
        decodedData = atob(encryptedText);
      } catch (base64Error) {
        console.error('Base64解码失败:', base64Error);
        throw new Error('解密失败: Base64解码错误，数据可能已损坏');
      }
      
      // 将Base64字符串转换回二进制数据
      const encryptedData = new Uint8Array(
        decodedData.split('').map(char => char.charCodeAt(0))
      );
      
      // 检查数据长度是否合理
      if (encryptedData.length <= 12) {
        console.error('解密失败: 数据长度不符合AES-GCM要求');
        throw new Error('解密失败: 数据格式错误');
      }
      
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
      const decodedText = decoder.decode(decryptedData);
      
      // 检查解密结果是否有效
      if (decodedText === null || decodedText === undefined || decodedText.length === 0) {
        console.warn('解密结果为空');
      } else {
        console.log(`解密成功，解密后内容长度: ${decodedText.length}`);
      }
      
      return decodedText;
    } catch (cryptoError) {
      console.error('Web Crypto API解密失败:', cryptoError);
      
      // 尝试各种处理方式
      if (password.length < 4) {
        throw new Error('解密失败: 密码太短，可能不正确');
      }
      
      // 尝试使用简单解密作为最后的备用选项
      try {
        console.log('尝试使用简单解密作为最后备用...');
        // 重新构造为简单格式并尝试解密
        const simplifiedText = 'SIMPLE:' + btoa(encryptedText);
        return simpleDecrypt(simplifiedText, password);
      } catch (fallbackError) {
        console.error('所有解密方法都失败:', fallbackError);
        throw new Error('解密失败，请检查密码是否正确');
      }
    }
  } catch (error) {
    console.error('解密过程中出错:', error);
    throw error;
  }
}

/**
 * 计算过期时间
 * @param hours 小时数（可以是小数，如0.0833表示5分钟，0.5表示30分钟）
 * @param createdAt 创建时间（可选），如果不提供则使用当前中国时间
 * @returns 过期的时间戳（毫秒）
 */
export function calculateExpirationTime(hours: number, createdAt?: number): number {
  // 使用创建时间或当前中国时间作为基准
  const baseTime = createdAt || getChinaTimeMs();
  const millisecondsToExpire = Math.floor(hours * 3600 * 1000); // 每小时3600秒，每秒1000毫秒
  
  // 直接添加毫秒数
  const expiresAt = baseTime + millisecondsToExpire;
  
  // 计算分钟和秒，用于日志显示
  const minutes = Math.floor(hours * 60);
  const seconds = Math.floor((hours * 60 * 60) % 60);
  
  console.log(`[calculateExpirationTime] 基准时间: ${formatChinaTime(baseTime)} (${baseTime})`);
  console.log(`[calculateExpirationTime] 过期时间: ${formatChinaTime(expiresAt)} (${expiresAt})`);
  console.log(`[calculateExpirationTime] 基准时间时间戳: ${baseTime}`);
  console.log(`[calculateExpirationTime] 过期时间时间戳: ${expiresAt}`);
  console.log(`[calculateExpirationTime] 毫秒差: ${millisecondsToExpire}`);
  
  if (hours >= 1) {
    console.log(`[calculateExpirationTime] 设置过期时间: ${hours}小时 (${minutes}分钟)，共${millisecondsToExpire}毫秒`);
  } else {
    console.log(`[calculateExpirationTime] 设置过期时间: ${minutes}分钟${seconds > 0 ? seconds + '秒' : ''}，共${millisecondsToExpire}毫秒`);
  }
  
  return expiresAt;
}

/**
 * 检查内容是否已过期
 * @param expirationTime 过期时间戳
 * @returns 是否已过期
 */
export function isExpired(expirationTime: number): boolean {
  // 获取当前中国时区时间
  const now = getChinaTimeMs();
  
  // 对比时间戳判断是否过期
  const isExp = now > expirationTime;
  
  console.log(`[isExpired] 当前中国时间戳: ${now} (${formatChinaTime(now)})`);
  console.log(`[isExpired] 过期时间戳: ${expirationTime} (${formatChinaTime(expirationTime)})`);
  console.log(`[isExpired] 时间差(毫秒): ${expirationTime - now}`);
  console.log(`[isExpired] 是否过期: ${isExp}`);
  
  return isExp;
}

/**
 * 格式化过期时间为可读形式
 * @param expirationTime 过期时间戳
 * @returns 格式化的过期时间字符串
 */
export function formatExpirationTime(expirationTime: number): string {
  // 获取当前中国时区时间
  const now = getChinaTimeMs();
  // 计算时间差（毫秒）
  const diff = expirationTime - now;
  
  console.log(`[formatExpirationTime] 当前中国时间戳: ${now} (${formatChinaTime(now)})`);
  console.log(`[formatExpirationTime] 过期时间戳: ${expirationTime} (${formatChinaTime(expirationTime)})`);
  console.log(`[formatExpirationTime] 时间差(毫秒): ${diff}`);
  
  if (diff <= 0) {
    return '已过期';
  }
  
  // 计算小时、分钟和秒
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);
  
  console.log(`[formatExpirationTime] 解析后时间差: ${hours}小时 ${minutes}分钟 ${seconds}秒`);
  
  // 根据时间差范围返回不同的格式化字符串
  if (hours > 0) {
    return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}后过期`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds > 0 ? seconds + '秒' : ''}后过期`;
  } else {
    return `${seconds}秒后过期`;
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