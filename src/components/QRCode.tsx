"use client";

import { useEffect, useState } from 'react';
import { generateQRCodeUrl } from '@/utils/helpers';

interface QRCodeProps {
  url: string;
  size?: number;
  background?: string;
  foreground?: string;
}

export default function QRCode({ 
  url, 
  size = 200,
  background = '#ffffff',
  foreground = '#000000'
}: QRCodeProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchQrCode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const apiUrl = generateQRCodeUrl(url, size);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`获取QR码失败: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.url) {
          setQrCodeDataUrl(data.url);
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          throw new Error("未知错误");
        }
      } catch (err) {
        console.error("获取QR码失败:", err);
        setError(err instanceof Error ? err.message : "获取QR码时出错");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (url) {
      fetchQrCode();
    }
  }, [url, size]);
  
  if (isLoading) {
    return (
      <div className="w-full max-w-[200px] h-[200px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-16 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
          <div className="mt-2 text-sm text-gray-400 dark:text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full max-w-[200px] h-[200px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
        <div className="text-center text-red-500 text-sm p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          加载失败
        </div>
      </div>
    );
  }
  
  if (!qrCodeDataUrl) {
    return (
      <div className="w-full max-w-[200px] h-[200px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="80" 
          height="80" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-gray-400 dark:text-gray-500"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <path d="M7 7h.01" />
          <path d="M17 7h.01" />
          <path d="M7 17h.01" />
          <rect x="10" y="10" width="4" height="4" />
        </svg>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded p-2 shadow-sm">
      <img 
        src={qrCodeDataUrl} 
        alt="访问二维码" 
        className="w-full max-w-[200px] h-auto"
      />
      <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
        扫描访问
      </div>
    </div>
  );
} 