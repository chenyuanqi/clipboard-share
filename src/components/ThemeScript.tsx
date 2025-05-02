export default function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        // 仅在客户端执行此脚本
        if (typeof window === 'undefined') return;
        
        // 尝试从本地存储获取主题偏好
        let savedTheme = null;
        try {
          savedTheme = localStorage.getItem('theme');
        } catch (e) {
          // 忽略localStorage错误
        }
        
        // 如果没有保存的主题，检查系统偏好
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // 决定使用的主题
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        // 立即应用主题，避免闪烁
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {
        // 出错时，回退到默认主题
        console.error('主题初始化错误:', e);
      }
    })();
  `;

  // 使用非阻塞脚本
  return (
    <script 
      dangerouslySetInnerHTML={{ __html: themeScript }} 
      id="theme-script"
      suppressHydrationWarning
    />
  );
} 