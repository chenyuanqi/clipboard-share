/** @type {import('next').NextConfig} */
const nextConfig = {
  // 保留最基本的配置
  reactStrictMode: true,
  
  // ESLint配置
  eslint: {
    // 即使有错误也继续构建
    ignoreDuringBuilds: true,
  },
  
  // TypeScript配置
  typescript: {
    // 即使有类型错误也继续构建
    ignoreBuildErrors: true,
  },
};

export default nextConfig; 