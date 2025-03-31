import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * 主要按钮组件
 * 用于表示主要操作的蓝色按钮
 */
export const PrimaryButton: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <button
      className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * 次要按钮组件
 * 用于表示次要操作的灰色按钮
 */
export const SecondaryButton: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <button
      className={`bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * 警告按钮组件
 * 用于表示警告操作的红色按钮
 */
export const DangerButton: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <button
      className={`bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}; 