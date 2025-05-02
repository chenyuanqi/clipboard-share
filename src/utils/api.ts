/**
 * 服务器API交互工具
 * 用于与服务器进行密码存储、验证等操作
 */

// 定义缓存内容的类型
interface CacheItem {
  value: unknown;
  expires: number;
}

// 添加缓存来减少重复请求
const apiCache = new Map<string, CacheItem>();
const cacheTTL = 60000; // 缓存有效期1分钟

/**
 * 在服务器上保存密码
 * @param id 剪贴板ID
 * @param password 密码
 * @returns 是否成功
 */
export async function savePasswordToServer(id: string, password: string): Promise<boolean> {
  try {
    console.log(`正在将密码保存到服务器 (ID=${id})...`);
    
    // 使用fetch的cache选项
    const response = await fetch('/api/passwords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 添加防缓存头
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ id, password }),
      // 确保不使用浏览器缓存
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('服务器保存密码失败:', data.error || response.statusText);
      return false;
    }
    
    // 清除此ID的缓存
    invalidateCache(id);
    
    console.log(`密码已成功保存到服务器 (ID=${id})`);
    return true;
  } catch (error) {
    console.error('服务器保存密码出错:', error);
    return false;
  }
}

/**
 * 从服务器验证密码
 * @param id 剪贴板ID
 * @param password 密码
 * @returns 是否匹配
 */
export async function verifyPasswordOnServer(id: string, password: string): Promise<boolean> {
  try {
    // 检查是否有缓存的验证结果
    const cacheKey = `verify-${id}-${password}`;
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult !== undefined) {
      console.log(`使用缓存的密码验证结果 (ID=${id}):`, cachedResult ? '匹配' : '不匹配');
      return cachedResult;
    }
    
    console.log(`正在服务器上验证密码 (ID=${id})...`);
    
    const response = await fetch('/api/passwords', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 添加防缓存头
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ id, password }),
      // 确保不使用浏览器缓存
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('服务器验证密码请求失败:', response.statusText);
      return false;
    }
    
    // 缓存结果
    saveToCache(cacheKey, data.valid === true);
    
    console.log(`服务器密码验证结果: ${data.valid ? '成功' : '失败'}`);
    return data.valid === true;
  } catch (error) {
    console.error('服务器验证密码出错:', error);
    return false;
  }
}

/**
 * 检查服务器上是否存在密码
 * @param id 剪贴板ID
 * @returns 是否存在
 */
export async function checkPasswordExistsOnServer(id: string): Promise<boolean> {
  try {
    // 检查缓存
    const cacheKey = `exists-${id}`;
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult !== undefined) {
      console.log(`使用缓存的密码存在结果 (ID=${id}):`, cachedResult ? '存在' : '不存在');
      return cachedResult;
    }
    
    console.log(`正在检查服务器上是否存在密码 (ID=${id})...`);
    
    // 添加随机参数避免缓存
    const timestamp = Date.now();
    const response = await fetch(`/api/passwords?id=${encodeURIComponent(id)}&_t=${timestamp}`, {
      method: 'GET',
      headers: {
        // 添加防缓存头
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
      // 确保不使用浏览器缓存
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('检查密码存在请求失败:', response.statusText);
      return false;
    }
    
    // 缓存结果
    saveToCache(cacheKey, data.exists === true);
    
    console.log(`服务器密码检查结果: ${data.exists ? '存在' : '不存在'}`);
    return data.exists === true;
  } catch (error) {
    console.error('检查密码存在出错:', error);
    return false;
  }
}

/**
 * 从服务器删除密码
 * @param id 剪贴板ID
 * @returns 是否成功
 */
export async function deletePasswordFromServer(id: string): Promise<boolean> {
  try {
    console.log(`正在从服务器删除密码 (ID=${id})...`);
    
    const response = await fetch(`/api/passwords?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        // 添加防缓存头
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
      // 确保不使用浏览器缓存
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('服务器删除密码失败:', data.error || response.statusText);
      return false;
    }
    
    // 清除此ID的缓存
    invalidateCache(id);
    
    console.log(`密码已从服务器成功删除 (ID=${id})`);
    return true;
  } catch (error) {
    console.error('服务器删除密码出错:', error);
    return false;
  }
}

/**
 * 从服务器获取剪贴板内容
 * @param id 剪贴板ID
 * @returns 剪贴板数据或null；如果剪贴板已过期，返回{ expired: true }
 */
export async function getClipboardFromServer(id: string): Promise<Record<string, unknown> | null | { expired: true }> {
  try {
    console.log(`正在从服务器获取剪贴板内容 (ID=${id})...`);
    
    // 尝试从缓存获取
    const cacheKey = `clipboard_${id}_${new Date().toDateString()}`;
    const cachedData = getFromCache(cacheKey);
    if (cachedData !== undefined) {
      console.log(`使用缓存的剪贴板数据 (ID=${id})`);
      if (cachedData && (cachedData as any).expired === true) {
        console.log(`缓存显示ID=${id}的剪贴板已过期`);
        return { expired: true };
      }
      return cachedData as Record<string, unknown> | null;
    }
    
    const timestamp = Date.now(); // 添加时间戳防止缓存
    const response = await fetch(`/api/clipboard?id=${encodeURIComponent(id)}&_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
    });
    
    if (!response.ok) {
      console.error(`获取剪贴板内容失败: HTTP ${response.status} ${response.statusText}`);
      // 缓存失败结果
      saveToCache(cacheKey, null);
      return null;
    }
    
    const data = await response.json();
    
    // 检查是否过期
    if (data.expired === true) {
      console.log(`ID=${id}的剪贴板已过期`);
      
      // 缓存过期状态，但使用较短的过期时间
      saveToCache(cacheKey, { expired: true });
      
      // 返回过期标志
      return { expired: true };
    }
    
    // 检查是否存在
    if (!data.exists || !data.clipboard) {
      console.log(`ID=${id}的剪贴板在服务器上不存在`);
      // 缓存结果
      saveToCache(cacheKey, null);
      return null;
    }
    
    console.log(`成功从服务器获取ID=${id}的剪贴板内容`);
    
    // 缓存结果
    saveToCache(cacheKey, data.clipboard);
    
    return data.clipboard;
  } catch (error) {
    console.error('从服务器获取剪贴板内容出错:', error);
    return null;
  }
}

/**
 * 将剪贴板内容保存到服务器
 * @param id 剪贴板ID
 * @param content 内容
 * @param isProtected 是否密码保护
 * @param expirationTime 过期时间值（可以是小时，也可以是分钟带单位如"5m"）
 * @returns 是否成功
 */
export async function saveClipboardToServer(
  id: string, 
  content: string, 
  isProtected: boolean = false, 
  expirationTime: string | number = 24
): Promise<boolean> {
  try {
    console.log(`【API调用】正在将剪贴板内容保存到服务器 (ID=${id})...`);
    console.log(`【API调用】保存前参数检查: `);
    console.log(`【API调用】- isProtected = ${isProtected} (${typeof isProtected})`);
    console.log(`【API调用】- expirationTime = ${expirationTime} (${typeof expirationTime})`);
    
    // 将布尔值转换为数字表示
    const protectedValue = isProtected ? 1 : 0;
    
    // 解析过期时间，支持分钟单位格式
    let finalExpirationTime: string | number = expirationTime;
    
    // 记录原始参数值用于日志
    const originalExpirationTime = expirationTime;
    
    // 如果是带单位的字符串形式
    if (typeof expirationTime === 'string' && expirationTime.endsWith('m')) {
      // 保持原样，API会解析分钟单位
      console.log(`【API调用】检测到分钟单位格式: ${expirationTime}`);
    } else {
      // 如果是数字或数字字符串，视为小时
      const hours = typeof expirationTime === 'string' ? parseFloat(expirationTime) : expirationTime;
      // 转换为分钟单位字符串
      finalExpirationTime = `${hours * 60}m`;
      console.log(`【API调用】小时值(${hours})已转换为分钟格式: ${finalExpirationTime}`);
    }
    
    console.log(`【API调用】发送到服务器的参数:`);
    console.log(`【API调用】- id = ${id}`);
    console.log(`【API调用】- content长度 = ${content.length} 字符`);
    console.log(`【API调用】- isProtected = ${protectedValue} (${typeof protectedValue})`);
    console.log(`【API调用】- expirationTime(原始) = ${originalExpirationTime}`);
    console.log(`【API调用】- expirationHours(发送) = ${finalExpirationTime}`);
    
    // 构建请求体
    const requestBody = { 
      id, 
      content, 
      isProtected: protectedValue, 
      expirationHours: finalExpirationTime // 服务器端使用这个参数名
    };
    
    console.log(`【API调用】完整的请求体:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('/api/clipboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('【API调用失败】服务器保存剪贴板内容失败:', data.error || response.statusText);
      return false;
    }
    
    // 清除此ID的缓存
    invalidateCache(id);
    
    console.log(`【API调用成功】剪贴板内容已成功保存到服务器 (ID=${id})`);
    
    // 打印服务器返回的数据
    if (data.clipboard) {
      console.log(`【API调用】服务器返回的剪贴板数据:`, {
        id: id,
        isProtected: data.clipboard.isProtected,
        createdAt: new Date(data.clipboard.createdAt).toLocaleString(),
        expiresAt: new Date(data.clipboard.expiresAt).toLocaleString(),
        毫秒差: data.clipboard.expiresAt - data.clipboard.createdAt,
        小时差: (data.clipboard.expiresAt - data.clipboard.createdAt) / (3600 * 1000),
        分钟差: (data.clipboard.expiresAt - data.clipboard.createdAt) / (60 * 1000)
      });
    }
    
    return true;
  } catch (error) {
    console.error('【API调用错误】服务器保存剪贴板内容出错:', error);
    return false;
  }
}

/**
 * 从服务器删除剪贴板
 * @param id 剪贴板ID
 * @returns 是否成功
 */
export async function deleteClipboardFromServer(id: string): Promise<boolean> {
  try {
    console.log(`正在从服务器删除剪贴板 (ID=${id})...`);
    
    const response = await fetch(`/api/clipboard?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('服务器删除剪贴板失败:', data.error || response.statusText);
      return false;
    }
    
    // 清除此ID的缓存
    invalidateCache(id);
    
    console.log(`剪贴板已从服务器成功删除 (ID=${id})`);
    return true;
  } catch (error) {
    console.error('服务器删除剪贴板出错:', error);
    return false;
  }
}

/**
 * 从缓存获取数据
 */
function getFromCache(key: string): unknown | undefined {
  const item = apiCache.get(key);
  if (!item) return undefined;
  
  // 检查是否过期
  if (Date.now() > item.expires) {
    apiCache.delete(key);
    return undefined;
  }
  
  return item.value;
}

/**
 * 保存数据到缓存
 */
function saveToCache(key: string, value: unknown): void {
  apiCache.set(key, {
    value,
    expires: Date.now() + cacheTTL
  });
}

// 辅助函数：使特定ID相关的所有缓存失效
function invalidateCache(id: string): void {
  const keysToDelete: string[] = [];
  
  // 查找并标记所有关联到此ID的缓存条目
  apiCache.forEach((_, key) => {
    if (key.includes(id)) {
      keysToDelete.push(key);
    }
  });
  
  // 删除标记的条目
  keysToDelete.forEach(key => apiCache.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`已清除 ${keysToDelete.length} 个与ID=${id}相关的缓存条目`);
  }
} 