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
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 挂载后再设置主题，避免服务器端渲染不一致
    setMounted(true);
    
    // 获取存储的主题
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    
    // 获取系统偏好
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // 确定使用的主题
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    
    // 应用主题类
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // 切换主题函数
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      
      // 保存主题到本地存储
      localStorage.setItem("theme", newTheme);
      
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

  // 防止闪烁的处理：在客户端水合完成前不渲染组件
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
} 