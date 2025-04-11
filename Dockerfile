# 使用 Node.js 18 作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV DISABLE_ESLINT_PLUGIN=true
ENV NEXT_TELEMETRY_DISABLED=1

# 配置 npm 使用淘宝镜像
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set disturl https://npmmirror.com/dist && \
    npm config set sharp_binary_host https://npmmirror.com/mirrors/sharp && \
    npm config set sharp_libvips_binary_host https://npmmirror.com/mirrors/sharp-libvips

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml
COPY package*.json pnpm*.yaml ./

# 使用 pnpm 安装依赖
RUN pnpm install --frozen-lockfile --prod

# 创建data目录
RUN mkdir -p /app/data && chmod 777 /app/data

# 复制源代码
COPY . .

# 确保目录权限正确
RUN chown -R node:node /app

# 使用 pnpm 构建应用
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 使用非root用户运行
USER node

# 启动命令
CMD ["pnpm", "start"] 