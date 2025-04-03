/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用路径别名支持
  experimental: {
    // 确保基于tsconfig.json中的paths配置启用路径别名
    typedRoutes: true,
  },
  // 添加其他配置选项
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig; 