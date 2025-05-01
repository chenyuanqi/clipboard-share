export default function ThemeScript() {
  const themeScript = `
    (function() {
      // 尝试从本地存储获取主题偏好
      const savedTheme = localStorage.getItem('theme');
      
      // 如果没有保存的主题，检查系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // 决定使用的主题
      const theme = savedTheme || (prefersDark ? 'dark' : 'light');
      
      // 立即应用主题，避免闪烁
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
} 