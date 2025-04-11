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
# 标准模式（推荐）
npm run dev
# 或
yarn dev
# 或
pnpm dev

# 使用 Turbopack（实验性功能）
npm run dev:turbo
# 或
yarn dev:turbo
# 或
pnpm dev:turbo
```

打开 [http://localhost:3000](http://localhost:3000) 查看开发环境中的应用。

### 构建生产版本

```bash
# 标准构建
npm run build
# 或
yarn build
# 或
pnpm build

# 忽略 ESLint 警告的构建
npm run build:ignore-lint
# 或
yarn build:ignore-lint
# 或
pnpm build:ignore-lint
```

### 代码检查

```bash
# 自动修复 ESLint 问题
npm run lint
# 或
yarn lint
# 或
pnpm lint

# 严格检查模式
npm run lint:strict
# 或
yarn lint:strict
# 或
pnpm lint:strict
```

## 使用方法

1. 在首页创建新的剪贴板
2. 选择性地设置自定义路径、密码和过期时间
3. 当使用已存在的路径时，系统会提供美观的对话框让您选择查看现有内容或创建新的
4. 将生成的链接或二维码分享给他人
5. 访问者可以通过链接查看或编辑内容（如有密码保护，需要输入密码）
6. 在任何设备上访问同一链接，内容将自动同步

## 最新改进

- ✨ **优化构建配置**：改进了构建流程，解决了 ESLint 和 TypeScript 类型检查的问题
- 🎨 **Tailwind CSS 配置**：修复了样式导入和配置问题，确保正确应用所有设计元素
- 🔧 **开发环境增强**：添加了标准模式和 Turbopack 实验模式的开发选项
- 🛡️ **类型安全改进**：使用泛型和更严格的类型定义提高了代码质量
- 📊 **更好的数据缓存**：改进了 API 缓存机制，提高了应用性能
- ✅ **更好的错误处理**：增强了错误捕获和恢复机制

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
