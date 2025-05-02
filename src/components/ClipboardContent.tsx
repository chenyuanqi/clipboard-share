import React from 'react';

interface ClipboardContentProps {
  content: string;
}

/**
 * 剪贴板内容显示组件
 * 显示剪贴板的内容，支持自动换行和格式保留
 */
const ClipboardContent: React.FC<ClipboardContentProps> = ({ content }) => {
  // 检测内容是否为加密内容
  const isEncrypted = React.useMemo(() => {
    if (!content) return false;
    return content.startsWith('SIMPLE:') || 
           content.startsWith('SIMPLE-UTF8:') || 
           content.startsWith('CRYPTO:');
  }, [content]);
  
  // 检测内容是否为JSON
  const isJson = React.useMemo(() => {
    if (isEncrypted) return false;
    try {
      JSON.parse(content);
      return content.trim().startsWith('{') || content.trim().startsWith('[');
    } catch (e) {
      return false;
    }
  }, [content, isEncrypted]);
  
  // 检测内容是否为代码
  const isCode = React.useMemo(() => {
    if (isEncrypted) return false;
    // 简单判断是否包含代码特征
    const codePatterns = [
      /function\s+\w+\s*\(/i,
      /class\s+\w+/i,
      /const\s+\w+\s*=/i,
      /let\s+\w+\s*=/i,
      /var\s+\w+\s*=/i,
      /import\s+.*from/i,
      /<\w+(\s+\w+=".*")*\s*>/i,
      /^\s*\/\//m
    ];
    
    return codePatterns.some(pattern => pattern.test(content));
  }, [content, isEncrypted]);
  
  // 添加对解密失败信息的检测
  const isEncryptionErrorMessage = React.useMemo(() => {
    if (!content) return false;
    return content.startsWith('【解密失败】');
  }, [content]);
  
  if (!content) {
    return (
      <div className="text-gray-500 dark:text-gray-400 italic">
        无内容
      </div>
    );
  }
  
  // 如果是加密内容，显示提示
  if (isEncrypted) {
    return (
      <div className="text-center">
        <div className="bg-yellow-100 dark:bg-yellow-900 p-6 rounded-lg inline-block mt-4 shadow-md w-full max-w-md mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-3V8m0 0V5m0 3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg text-yellow-800 dark:text-yellow-200 font-medium">
            此内容已加密
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
            您需要输入密码才能查看此内容
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
            请在密码框中输入正确的密码并点击"验证"按钮
          </p>
          
          <div className="mt-6 pt-4 border-t border-yellow-200 dark:border-yellow-800">
            <details className="text-left">
              <summary className="text-xs font-medium text-yellow-600 dark:text-yellow-400 cursor-pointer">
                技术详情 (点击展开)
              </summary>
              <div className="mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded text-left overflow-x-auto">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">加密格式: {content.startsWith('SIMPLE:') ? 'SIMPLE' : content.startsWith('CRYPTO:') ? 'CRYPTO' : '未知'}</p>
                <code className="text-xs font-mono text-gray-800 dark:text-gray-300 block overflow-x-auto whitespace-pre-wrap break-all">
                  {content.substring(0, 50)}{content.length > 50 ? '...' : ''}
                </code>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }
  
  // 如果是解密失败的错误消息，友好显示
  if (isEncryptionErrorMessage) {
    return (
      <div className="text-center">
        <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg shadow-md w-full max-w-md mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-3">
            解密失败
          </h3>
          
          <div className="text-left text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {content.replace('【解密失败】', '')}
          </div>
          
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {window.scrollTo({top: 0, behavior: 'smooth'})}}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-800 dark:text-red-200 rounded-lg text-sm transition-colors"
            >
              滚动到密码输入框
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // 根据内容类型选择不同的渲染方式
  if (isJson) {
    try {
      const formattedJson = JSON.stringify(JSON.parse(content), null, 2);
      return (
        <pre className="font-mono text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto max-h-[80vh]">
          {formattedJson}
        </pre>
      );
    } catch (e) {
      // 如果JSON解析失败，作为普通文本显示
    }
  }
  
  if (isCode) {
    return (
      <pre className="font-mono text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto max-h-[80vh]">
        {content}
      </pre>
    );
  }
  
  // 普通文本，保留换行但允许自动换行
  return (
    <div className="whitespace-pre-wrap break-words">
      {content}
    </div>
  );
};

export default ClipboardContent; 