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
- Ubuntu 16.04 LTS
- 至少 1GB RAM
- 至少 10GB 磁盘空间

### 软件要求
- Docker 20.10+
- Docker Compose 2.0+
- Nginx 1.18+

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

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

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

当有新版本需要部署时：

```bash
# 拉取最新代码
git pull

# 重新构建并重启容器
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 2. 备份数据

创建备份脚本 `backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/clipboard"
DATE=$(date +%Y%m%d)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据目录
tar -czf $BACKUP_DIR/data-$DATE.tar.gz ./data

# 删除7天前的备份
find $BACKUP_DIR -name "data-*.tar.gz" -mtime +7 -delete
```

添加定时任务：

```bash
# 编辑 crontab
sudo crontab -e

# 添加每日备份任务 (凌晨3点)
0 3 * * * /path/to/backup.sh
```

## 故障排除

### 1. 容器无法启动

检查容器日志：

```bash
docker-compose logs -f
```

常见问题解决方案：
- 端口冲突：检查 3000 端口是否被占用
- 权限问题：确保 data 目录有正确的读写权限
- 环境变量：检查 .env 文件是否存在且正确

### 2. Nginx 无法代理请求

检查 Nginx 错误日志：

```bash
sudo tail -f /var/log/nginx/error.log
```

如果看到"Connection refused"错误，确保 Docker 容器正在运行。

### 3. 内存不足

如果服务器内存较小，可以在 docker-compose.yml 中添加内存限制：

```yaml
services:
  app:
    # ... 其他配置 ...
    deploy:
      resources:
        limits:
          memory: 512M
```

---

如有其他部署或维护问题，请参考:
- [Docker 文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Nginx 文档](https://nginx.org/en/docs/) 