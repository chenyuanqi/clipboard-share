/**
 * 加密工具函数
 * 处理内容的加密和解密
 */

/**
 * 解密文本内容
 * @param encryptedText 加密的文本
 * @param password 解密密码
 * @returns 解密后的文本
 */
export function decrypt(encryptedText: string, password: string): string {
  try {
    // 检查加密类型
    if (encryptedText.startsWith('SIMPLE:')) {
      console.log('检测到简单加密内容，使用简单解密方法');
      return simpleDecrypt(encryptedText, password);
    }
    
    // 处理CRYPTO格式
    if (encryptedText.startsWith('CRYPTO:')) {
      encryptedText = encryptedText.substring(7);
    }
    
    // 将Base64字符串转换回二进制数据
    const encryptedData = new Uint8Array(
      atob(encryptedText).split('').map(char => char.charCodeAt(0))
    );
    
    // 提取IV和加密数据
    const _iv = encryptedData.slice(0, 12);
    const _data = encryptedData.slice(12);
    
    // 这里实现实际的解密逻辑
    // 注意：这是一个同步版本，与 helpers.ts 中的异步版本不同
    // 为了简化，这里直接返回一个解密结果
    // 实际项目中应使用适当的加密库或 Web Crypto API
    
    return atob(encryptedText.substring(16)); // 简化实现
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败，请检查密码是否正确');
  }
}

/**
 * 简单解密方法 (与helpers.ts中的simpleDecrypt对应)
 */
function simpleDecrypt(encryptedText: string, password: string): string {
  try {
    // 移除标记并解码
    const base64 = encryptedText.substring(7);
    const encoded = atob(base64);
    
    const result = [];
    for (let i = 0; i < encoded.length; i++) {
      const charCode = encoded.charCodeAt(i) ^ password.charCodeAt(i % password.length);
      result.push(String.fromCharCode(charCode));
    }
    return result.join('');
  } catch (error) {
    console.error('简单解密失败:', error);
    throw new Error('解密失败，请检查密码是否正确');
  }
} 