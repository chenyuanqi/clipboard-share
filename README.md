# 剪贴板共享 (Clipboard Share)

一个简单、安全的在线剪贴板共享工具，支持密码保护、自动过期和二维码分享。

## 功能特点

- 🔐 **密码保护**：为剪贴板设置访问密码，提供端到端加密
- ⏱️ **自动过期**：所有剪贴板最长保存24小时，自动清理
- 🔗 **自定义路径**：创建个性化、易记的URL
- 📱 **响应式设计**：适配各种设备屏幕，包括移动端
- 🔄 **自动保存**：编辑内容时自动保存
- 📊 **二维码分享**：自动生成二维码，方便移动设备访问
- 🌙 **深色模式**：支持浅色/深色主题

## 技术栈

- [Next.js 15](https://nextjs.org/) - React框架
- [React 19](https://react.dev/) - 用户界面库
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Tailwind CSS](https://tailwindcss.com/) - 响应式设计
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - 数据加密

## 开始使用

### 前提条件

- Node.js 18.17 或更高版本
- npm 或 yarn 或 pnpm

### 安装

```bash
# 克隆仓库
git clone https://github.com/chenyuanqi/clipboard-share.git
cd clipboard-share

# 安装依赖
npm install
# 或
yarn install
# 或
pnpm install
```

### 开发

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看开发环境中的应用。

### 构建生产版本

```bash
npm run build
npm start
# 或
yarn build
yarn start
# 或
pnpm build
pnpm start
```

## 使用方法

1. 在首页创建新的剪贴板
2. 选择性地设置自定义路径、密码和过期时间
3. 将生成的链接或二维码分享给他人
4. 访问者可以通过链接查看或编辑内容（如有密码保护，需要输入密码）

## 隐私与安全

- 所有数据存储在用户的浏览器本地存储中
- 密码保护的剪贴板使用AES-GCM算法进行端到端加密
- 所有剪贴板内容在过期后自动删除
- 不收集用户数据，无跟踪技术

## 许可证

MIT
