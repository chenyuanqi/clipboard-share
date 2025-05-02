"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme 必须在 ThemeProvider 内部使用");
  }
  return context;
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 使用空字符串作为初始值避免水合不匹配
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 挂载后再设置主题，避免服务器端渲染不一致
    setMounted(true);
    
    // 从文档类列表中检测当前应用的主题
    // 这样可以与ThemeScript设置的保持一致
    const isDarkMode = document.documentElement.classList.contains("dark");
    setTheme(isDarkMode ? "dark" : "light");
  }, []);

  // 切换主题函数
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      
      // 保存主题到本地存储
      try {
        localStorage.setItem("theme", newTheme);
      } catch (e) {
        console.error("无法保存主题设置:", e);
      }
      
      // 更新 HTML 类
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      return newTheme;
    });
  };

  // 提供上下文值
  const contextValue = {
    theme,
    toggleTheme,
  };

  // 在客户端水合完成前只返回子元素，不提供上下文值
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
} 