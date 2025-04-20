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
 * @returns 剪贴板数据或null，如果过期则返回 { expired: true }
 */
export async function getClipboardFromServer(id: string): Promise<Record<string, unknown> | null | { expired: true }> {
  try {
    // 检查缓存
    const cacheKey = `clipboard-${id}`;
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult !== undefined) {
      console.log(`使用缓存的剪贴板内容 (ID=${id})`);
      return cachedResult;
    }
    
    console.log(`从服务器获取剪贴板内容 (ID=${id})...`);
    
    // 添加随机参数避免缓存
    const timestamp = Date.now();
    const response = await fetch(`/api/clipboard?id=${encodeURIComponent(id)}&_t=${timestamp}`, {
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
      console.error('从服务器获取剪贴板内容失败:', response.statusText);
      return null;
    }
    
    if (!data.exists) {
      // 检查是否是因为过期
      if (data.expired) {
        console.log(`ID=${id}的剪贴板已过期`);
        // 缓存过期结果
        saveToCache(cacheKey, { expired: true });
        return { expired: true };
      }
      
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
 * @param expirationHours 过期小时数
 * @returns 是否成功
 */
export async function saveClipboardToServer(
  id: string, 
  content: string, 
  isProtected: boolean = false, 
  expirationHours: number = 24
): Promise<boolean> {
  try {
    console.log(`正在将剪贴板内容保存到服务器 (ID=${id})...`);
    console.log(`保存前参数检查: isProtected=${isProtected} (${typeof isProtected})`);
    
    // 将布尔值转换为数字表示
    const protectedValue = isProtected ? 1 : 0;
    
    console.log(`发送到服务器的参数: id=${id}, content长度=${content.length}, isProtected=${protectedValue}, expirationHours=${expirationHours}`);
    
    const response = await fetch('/api/clipboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        id, 
        content, 
        isProtected: protectedValue, 
        expirationHours 
      }),
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('服务器保存剪贴板内容失败:', data.error || response.statusText);
      return false;
    }
    
    // 清除此ID的缓存
    invalidateCache(id);
    
    console.log(`剪贴板内容已成功保存到服务器 (ID=${id})`);
    
    // 打印服务器返回的数据
    if (data.clipboard) {
      console.log(`服务器返回的剪贴板数据:`, {
        id: id,
        isProtected: data.clipboard.isProtected,
        createdAt: new Date(data.clipboard.createdAt).toLocaleString(),
        expiresAt: new Date(data.clipboard.expiresAt).toLocaleString()
      });
    }
    
    return true;
  } catch (error) {
    console.error('服务器保存剪贴板内容出错:', error);
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