import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="w-full p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-2xl font-bold text-gray-800 dark:text-white">
            剪贴板共享
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-lg w-full mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-800 dark:text-white mb-6">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
            剪贴板不存在或已过期
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            您访问的剪贴板可能已过期、被删除或从未存在。所有剪贴板均有时效性，最长保存24小时。
          </p>
          <Link 
            href="/" 
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg inline-block transition"
          >
            创建新的剪贴板
          </Link>
        </div>
      </main>
    </div>
  );
} 