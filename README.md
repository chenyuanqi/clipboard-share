# 云剪 (Cloud Clipboard)

一个简单、安全的在线文本共享工具，支持密码保护、跨设备同步、自动过期和二维码分享。

## 功能特点

- 🔐 **密码保护**：为剪贴板设置访问密码，提供端到端加密
- 🔄 **跨设备同步**：在多设备间无缝访问和编辑您的内容
- ⏱️ **自动过期**：所有剪贴板最长保存48小时，自动清理
- 🔗 **自定义路径**：创建个性化、易记的URL
- 📱 **响应式设计**：适配各种设备屏幕，包括移动端
- 💾 **自动保存**：编辑内容时自动保存
- 📊 **二维码分享**：自动生成二维码，方便移动设备访问
- 🌙 **深色模式**：支持浅色/深色主题
- 👆 **交互反馈**：美观的对话框和按钮效果，提供更好的用户体验
- 🔒 **兼容性加密**：支持多种加密方式，确保在所有浏览器中可用
- 🧹 **自动清理**：定期清理过期内容，保持系统高效运行

## 技术栈

- [Next.js 15](https://nextjs.org/) - React框架，使用App Router
- [React 19](https://react.dev/) - 用户界面库
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Tailwind CSS](https://tailwindcss.com/) - 响应式设计
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - 高级数据加密
- [Server Actions](https://nextjs.org/docs/app/api-reference/functions/server-actions) - 服务器端数据处理
- [Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components) - 交互式UI组件

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
3. 当使用已存在的路径时，系统会提供美观的对话框让您选择查看现有内容或创建新的
4. 将生成的链接或二维码分享给他人
5. 访问者可以通过链接查看或编辑内容（如有密码保护，需要输入密码）
6. 在任何设备上访问同一链接，内容将自动同步

## 最新改进

- ✨ **美化的对话框**：替代原生浏览器确认框，提供一致的用户体验
- 🔄 **增强的加密方式**：同时支持高级的Web Crypto API和兼容性较好的简单加密，确保在所有浏览器中可用
- 🛡️ **更好的水合处理**：解决了服务器端渲染与客户端渲染不一致的问题
- 🧹 **定时自动清理**：添加了定期清理过期剪贴板的客户端组件，确保系统高效运行
- 📱 **改进的移动端体验**：优化了在小屏幕设备上的交互和显示

## 浏览器兼容性

- ✅ **现代浏览器**：Chrome、Firefox、Edge、Safari最新版本完全支持所有功能
- ✅ **旧版浏览器**：通过优化，确保核心功能在不支持Web Crypto API的浏览器中也能工作
- ✅ **移动设备**：针对iOS和Android设备进行了优化

## 隐私与安全

- 数据存储在本地浏览器和云端，确保跨设备同步功能
- 密码保护的剪贴板使用AES-GCM算法进行端到端加密
- 为不支持Web Crypto API的浏览器提供备选加密方式
- 所有剪贴板内容在过期后自动删除
- 不收集任何个人身份信息，无侵入性跟踪技术

## 许可证

MIT
