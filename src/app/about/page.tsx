import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="w-full p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-800 dark:text-white">
            云剪
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">
              首页
            </Link>
            <Link href="/about" className="text-blue-600 dark:text-blue-400 font-medium">
              关于
            </Link>
            <Link 
              href="/history" 
              className="ml-1 w-9 h-9 flex items-center justify-center text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="浏览历史"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
            关于云剪
          </h1>
          
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              云剪是一个简单、安全的文本共享工具，让您可以轻松地在不同设备之间分享文本内容，无需注册账户，保护您的隐私。
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-4">
              主要功能
            </h2>
            
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full w-6 h-6 text-blue-600 dark:text-blue-400 font-medium text-sm mr-3 mt-0.5">1</span>
                <span>
                  <strong>临时链接</strong> - 所有剪贴板均为临时，有效期最长为24小时，到期后自动删除，保护您的敏感信息。
                </span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full w-6 h-6 text-blue-600 dark:text-blue-400 font-medium text-sm mr-3 mt-0.5">2</span>
                <span>
                  <strong>密码保护</strong> - 您可以为剪贴板设置密码，只有知道密码的人才能查看或编辑内容。所有加密和解密均在浏览器中完成，提供端到端加密。
                </span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full w-6 h-6 text-blue-600 dark:text-blue-400 font-medium text-sm mr-3 mt-0.5">3</span>
                <span>
                  <strong>自定义链接</strong> - 您可以创建自定义路径，使您的剪贴板链接更易记和分享。
                </span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full w-6 h-6 text-blue-600 dark:text-blue-400 font-medium text-sm mr-3 mt-0.5">4</span>
                <span>
                  <strong>二维码分享</strong> - 每个剪贴板自动生成访问二维码，方便在移动设备间快速分享。
                </span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full w-6 h-6 text-blue-600 dark:text-blue-400 font-medium text-sm mr-3 mt-0.5">5</span>
                <span>
                  <strong>自动保存</strong> - 编辑内容时会自动保存，防止意外丢失。
                </span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full w-6 h-6 text-blue-600 dark:text-blue-400 font-medium text-sm mr-3 mt-0.5">6</span>
                <span>
                  <strong>响应式设计</strong> - 在任何设备上都能获得良好的使用体验，包括手机、平板和桌面电脑。
                </span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full w-6 h-6 text-blue-600 dark:text-blue-400 font-medium text-sm mr-3 mt-0.5">7</span>
                <span>
                  <strong>跨设备同步</strong> - 您的剪贴板内容可以在多个设备间自动同步，确保您随时随地都能访问最新内容。
                </span>
              </li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-4">
              使用说明
            </h2>
            
            <ol className="space-y-4 text-gray-700 dark:text-gray-300">
              <li>
                <strong>创建剪贴板</strong>：在首页填写表单，可以设置自定义路径、密码和有效期。
              </li>
              <li>
                <strong>分享链接</strong>：创建后，您可以复制链接或使用生成的二维码分享给他人。
              </li>
              <li>
                <strong>访问受保护内容</strong>：如果剪贴板设置了密码，访问者需要输入正确的密码才能查看内容。
              </li>
              <li>
                <strong>编辑内容</strong>：在查看页面点击"编辑"按钮即可修改内容，修改后会自动保存。
              </li>
              <li>
                <strong>跨设备使用</strong>：在不同设备上访问同一个剪贴板链接，内容会自动同步。
              </li>
            </ol>
            
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-4">
              隐私与安全
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300">
              我们重视您的隐私和数据安全：
            </p>
            
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mt-3">
              <li>您的数据会安全地存储在本地和云端，确保多设备间的同步。</li>
              <li>密码保护的剪贴板使用AES-GCM加密算法进行端到端加密。</li>
              <li>所有剪贴板均为临时性质，过期后自动删除。</li>
              <li>该应用不收集任何个人身份信息或使用任何跟踪技术。</li>
            </ul>
          </div>
          
          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
            <Link 
              href="/" 
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:transform active:scale-95 text-white font-medium rounded-lg inline-block transition-all duration-150"
            >
              创建剪贴板
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 text-center text-gray-600 dark:text-gray-400">
        <p>© {new Date().getFullYear()} 云剪 - 安全地分享您的内容</p>
      </footer>
    </div>
  );
} 