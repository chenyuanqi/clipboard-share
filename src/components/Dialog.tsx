"use client";

import React, { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton } from './buttons';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function Dialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "确定",
  cancelText = "取消"
}: DialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  // 处理ESC键关闭弹窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // 打开时有淡入效果
      setTimeout(() => setIsVisible(true), 10);
      // 添加body样式，防止背景滚动
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  // 点击背景关闭弹窗
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };
  
  // 处理取消按钮点击
  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      if (onCancel) onCancel();
    }, 200);
  };
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity duration-200 backdrop-blur-sm ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
            {message}
          </p>
        </div>
        
        <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl flex justify-end space-x-3">
          <SecondaryButton onClick={handleCancel}>
            {cancelText}
          </SecondaryButton>
          <PrimaryButton onClick={() => {
            setIsVisible(false);
            setTimeout(onConfirm, 200);
          }}>
            {confirmText}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
} 