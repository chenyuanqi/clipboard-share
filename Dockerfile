# 使用 Node.js 18 作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV DISABLE_ESLINT_PLUGIN=true
ENV NEXT_TELEMETRY_DISABLED=1

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 创建data目录
RUN mkdir -p /app/data && chmod 777 /app/data

# 复制源代码
COPY . .

# 确保目录权限正确
RUN chown -R node:node /app

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 使用非root用户运行
USER node

# 启动命令
CMD ["npm", "start"] 