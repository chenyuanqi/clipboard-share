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
    // 将Base64字符串转换回二进制数据
    const encryptedData = new Uint8Array(
      atob(encryptedText).split('').map(char => char.charCodeAt(0))
    );
    
    // 提取IV和加密数据
    const iv = encryptedData.slice(0, 12);
    const data = encryptedData.slice(12);
    
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