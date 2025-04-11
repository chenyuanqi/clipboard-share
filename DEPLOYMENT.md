# 云剪 (Cloud Clipboard) Docker 部署指南

本文档提供了使用 Docker 在 Ubuntu 16.04 上部署云剪应用的详细步骤。

## 目录
- [环境要求](#环境要求)
- [Docker 环境配置](#docker-环境配置)
- [项目构建](#项目构建)
- [Docker 部署](#docker-部署)
- [Nginx 配置](#nginx-配置)
- [维护与更新](#维护与更新)
- [故障排除](#故障排除)

## 环境要求

### 服务器要求
- Ubuntu 16.04 LTS 或更高版本
- 至少 1GB RAM
- 至少 10GB 磁盘空间

### 软件要求
- Docker 20.10+
- Docker Compose 2.0+
- Nginx 1.18+
- Node.js 18.17+ (本地开发)

## Docker 环境配置

### 1. 安装 Docker

```bash
# 更新包索引
sudo apt-get update

# 安装必要的依赖
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# 添加 Docker 仓库
sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"

# 安装 Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
```

### 2. 安装 Docker Compose

```bash
# 下载 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. 安装 Nginx

```bash
# 安装 Nginx
sudo apt-get install -y nginx
```

## 项目构建

### 1. 准备项目文件

创建项目目录结构：

```bash
mkdir -p clipboard-share
cd clipboard-share
```

### 2. 创建 Dockerfile

创建 `Dockerfile`：

```dockerfile
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
```

### 3. 创建 docker-compose.yml

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: clipboard-share
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PASSWORD_SALT=your-strong-secret-salt-for-production
      - NEXT_PUBLIC_SERVER_URL=https://your-domain.com
    networks:
      - clipboard-network

networks:
  clipboard-network:
    driver: bridge
```

### 4. 创建数据目录

```bash
mkdir -p data
chmod 777 data
```

### 5. 配置环境变量

创建 `.env` 文件：

```
# 用于加密的密钥
PASSWORD_SALT="clipboard-share-secure-salt-key"

# 服务器URL (在生产环境中替换为你的实际域名)
NEXT_PUBLIC_SERVER_URL="https://your-domain.com"

# 日志级别
LOG_LEVEL="error"
```

## Docker 部署

### 1. 构建和启动容器

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### 2. 检查服务状态

```bash
# 查看容器状态
docker-compose ps

# 查看容器日志
docker-compose logs -f
```

## Nginx 配置

### 1. 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/clipboard-share
```

添加以下配置：

```nginx
# Nginx 缓存配置
proxy_cache_path /var/cache/nginx/clipboard_cache levels=1:2 keys_zone=clipboard_cache:10m max_size=100m inactive=30m use_temp_path=off;

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # 替换为你的域名
    
    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    
    # 安全相关设置
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    
    # 静态文件缓存
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
    
    # API 请求不缓存
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
        expires off;
    }
    
    # 页面路由可以缓存
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache clipboard_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_bypass $http_cache_control;
        add_header X-Cache-Status $upstream_cache_status;
        
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        
        add_header X-Robots-Tag "index, follow";
    }
}
```

### 2. 启用配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/clipboard-share /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## 维护与更新

### 1. 更新应用

当有新版本发布时，按照以下步骤更新应用:

```bash
# 进入项目目录
cd clipboard-share

# 拉取最新代码
git pull

# 重新构建并启动容器
docker-compose down
docker-compose build
docker-compose up -d
```

### 2. 备份数据

定期备份 `data` 目录:

```bash
# 创建备份
tar -czvf clipboard-backup-$(date +%Y%m%d).tar.gz data/

# 存储到安全位置
mv clipboard-backup-*.tar.gz /path/to/backup/location/
```

### 项目配置特别说明

#### ESLint 和 TypeScript 配置

项目包含了特定的 ESLint 和 TypeScript 配置，在生产环境构建中可能会遇到严格的类型检查和代码风格检查。以下是相关的配置文件:

1. **ESLint 配置**:
   - 主配置: `eslint.config.mjs` (新的扁平配置格式)
   - 兼容配置: `.eslintrc.json` (传统配置格式)

2. **TypeScript 配置**:
   - `tsconfig.json`: 定义 TypeScript 编译选项和路径别名

3. **Next.js 配置**:
   - `next.config.mjs`: 包含 ESLint 和 TypeScript 构建时行为配置

如果在生产环境构建时遇到 ESLint 或 TypeScript 错误，有以下选项:

```bash
# 使用忽略 ESLint 警告的构建命令
npm run build:ignore-lint
# 或
pnpm run build:ignore-lint
```

或者，可以修改 `next.config.mjs` 文件中的配置:

```js
// next.config.mjs
const nextConfig = {
  // ... 其他配置
  
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
```

#### 开发模式选项

在开发环境中，提供了两种启动模式:

1. **标准模式** (推荐用于稳定开发):
   ```bash
   npm run dev
   # 或
   pnpm run dev
   ```

2. **Turbopack 模式** (实验性，提供更快的热重载):
   ```bash
   npm run dev:turbo
   # 或
   pnpm run dev:turbo
   ```

## 故障排除

### 无法启动容器

如果容器无法启动，请检查日志:

```bash
docker-compose logs -f
```

### 权限问题

如果遇到权限问题，确保 `data` 目录有正确的权限:

```bash
chmod 777 data
```

### Nginx 配置问题

如果 Nginx 代理不工作，检查配置:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

如有其他部署或维护问题，请参考:
- [Docker 文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Nginx 文档](https://nginx.org/en/docs/) 