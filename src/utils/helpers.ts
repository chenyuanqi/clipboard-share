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
  try {
    // 先进行XOR加密
    const result = [];
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ password.charCodeAt(i % password.length);
      result.push(String.fromCharCode(charCode));
    }
    
    // 使用 encodeURIComponent 来确保所有字符（包括中文和特殊字符）都能正确处理
    const encodedText = encodeURIComponent(result.join(''));
    
    // 添加一个标记表示这是简单加密，并进行base64编码
    return 'SIMPLE:' + btoa(encodedText);
  } catch (error) {
    console.error('简单加密过程中的编码错误:', error);
    // 作为备选，直接对原始文本进行编码
    try {
      // 直接编码原始文本（不进行XOR加密）
      const fallbackEncoded = encodeURIComponent(text);
      return 'SIMPLE-UTF8:' + btoa(fallbackEncoded);
    } catch (fallbackError) {
      console.error('备选方案也失败:', fallbackError);
      throw new Error('加密失败: 无法处理此内容');
    }
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
      // 如果是直接使用原始文本编码的情况（没有XOR加密）
      const base64 = encryptedText.substring(12); // 去掉'SIMPLE-UTF8:'前缀
      try {
        // 先进行base64解码，然后URI解码
        const decodedText = decodeURIComponent(atob(base64));
        return decodedText;
      } catch (error) {
        console.error('UTF8模式解密失败:', error);
        throw new Error('解密失败: 无法解析UTF8编码内容');
      }
    } else if (encryptedText.startsWith('SIMPLE:')) {
      // 标准SIMPLE格式
      // 移除标记并解码
      const base64 = encryptedText.substring(7); // 去掉'SIMPLE:'前缀
      
      try {
        // 先进行base64解码，然后URI解码
        const decodedText = decodeURIComponent(atob(base64));
        
        // 使用相同的XOR算法解密
        const result = [];
        for (let i = 0; i < decodedText.length; i++) {
          const charCode = decodedText.charCodeAt(i) ^ password.charCodeAt(i % password.length);
          result.push(String.fromCharCode(charCode));
        }
        return result.join('');
      } catch (error) {
        console.error('XOR解密失败:', error);
        // 尝试直接解码
        try {
          return decodeURIComponent(atob(base64));
        } catch (finalError) {
          console.error('所有解密方法都失败:', finalError);
          throw new Error('解密失败: 内容已损坏或密码错误');
        }
      }
    } else {
      // 未知格式
      console.error('未知的加密格式:', encryptedText.substring(0, 20));
      throw new Error('解密失败: 未知的加密格式');
    }
  } catch (error) {
    console.error('简单解密失败:', error);
    throw error;
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
    
    console.log(`开始解密过程，内容类型: ${encryptedText.substring(0, Math.min(20, encryptedText.length))}...`);
    
    // 检查是否为已知的加密格式
    if (!encryptedText.startsWith('SIMPLE:') && 
        !encryptedText.startsWith('SIMPLE-UTF8:') && 
        !encryptedText.startsWith('CRYPTO:')) {
      // 不是加密内容，直接返回原文
      console.log('内容不是已知的加密格式，可能是明文，直接返回');
      return encryptedText;
    }
    
    // 检查加密类型
    if (encryptedText.startsWith('SIMPLE:') || encryptedText.startsWith('SIMPLE-UTF8:')) {
      console.log(`检测到简单加密内容，使用简单解密方法 (格式: ${encryptedText.substring(0, encryptedText.indexOf(':') + 1)})`);
      try {
        return simpleDecrypt(encryptedText, password);
      } catch (simpleError) {
        console.error('简单解密失败:', simpleError);
        throw simpleError; // 简单解密失败应该直接报错，不再继续尝试其他方法
      }
    }
    
    // 处理CRYPTO格式
    if (encryptedText.startsWith('CRYPTO:')) {
      console.log('检测到CRYPTO格式加密内容');
      
      // 检查Web Crypto API是否可用
      if (!isCryptoAvailable()) {
        console.error('解密失败: 内容需要Web Crypto API解密，但当前环境不支持');
        throw new Error('浏览器不支持安全解密，请使用现代浏览器');
      }
      
      // 移除前缀
      const cryptoData = encryptedText.substring(7);
      
      try {
        // 转换base64为二进制数据
        let binaryString;
        try {
          binaryString = atob(cryptoData);
          console.log(`Base64解码成功，解码后长度: ${binaryString.length}`);
        } catch (base64Error) {
          console.error('Base64解码失败:', base64Error);
          throw new Error('无法解码加密内容，可能已损坏');
        }
        
        // 将二进制字符串转换为Uint8Array
        const encryptedArray = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          encryptedArray[i] = binaryString.charCodeAt(i);
        }
        
        // 检查数据长度是否足够
        if (encryptedArray.length <= 12) {
          console.error('加密数据太短，无法包含有效的IV');
          throw new Error('加密内容长度不正确，可能已损坏');
        }
        
        // 提取IV和加密数据
        const iv = encryptedArray.slice(0, 12);
        const ciphertext = encryptedArray.slice(12);
        
        console.log(`IV提取成功，大小: ${iv.length}字节`);
        console.log(`加密数据大小: ${ciphertext.length}字节`);
        
        // 从密码生成加密密钥
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
        
        try {
          // 解密数据
          const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv
            },
            key,
            ciphertext
          );
          
          // 转换为文本
          const decoder = new TextDecoder('utf-8');
          const decryptedText = decoder.decode(decryptedBuffer);
          
          console.log(`解密成功，解密后内容长度: ${decryptedText.length}`);
          return decryptedText;
        } catch (decryptError) {
          console.error('解密操作失败:', decryptError);
          throw new Error('解密失败，密码可能不正确');
        }
      } catch (error) {
        console.error('CRYPTO格式解密失败:', error);
        throw error;
      }
    }
    
    // 未知格式，不应该到达这里
    console.error('未处理的加密格式:', encryptedText.substring(0, 20));
    throw new Error('未知的加密格式');
  } catch (error) {
    console.error('解密过程中出错:', error);
    // 抛出明确的错误信息
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('解密失败，请检查密码是否正确');
    }
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