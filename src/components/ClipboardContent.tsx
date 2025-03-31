import React from 'react';

interface ClipboardContentProps {
  content: string;
}

/**
 * 剪贴板内容显示组件
 * 显示剪贴板的内容，支持自动换行和格式保留
 */
const ClipboardContent: React.FC<ClipboardContentProps> = ({ content }) => {
  // 检测内容是否为JSON
  const isJson = React.useMemo(() => {
    try {
      JSON.parse(content);
      return content.trim().startsWith('{') || content.trim().startsWith('[');
    } catch (e) {
      return false;
    }
  }, [content]);
  
  // 检测内容是否为代码
  const isCode = React.useMemo(() => {
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
  }, [content]);
  
  if (!content) {
    return (
      <div className="text-gray-500 dark:text-gray-400 italic">
        无内容
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