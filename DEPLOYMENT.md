# 云剪 (Cloud Clipboard) 部署指南

本文档提供了将云剪应用从开发环境编译并部署到生产环境的详细步骤。

## 目录
- [编译项目](#编译项目)
- [创建部署包](#创建部署包)
- [生产服务器配置](#生产服务器配置)
- [Nginx 配置](#nginx-配置)
- [应用启动与管理](#应用启动与管理)
- [SSL 配置](#ssl-配置)
- [维护与更新](#维护与更新)
- [故障排除](#故障排除)

## 编译项目

### 前提条件
- Node.js 18.17 或更高版本
- npm 或 yarn 或 pnpm

### 步骤

1. **准备环境变量**

   创建生产环境配置文件:
   ```bash
   cat > .env.production << EOL
   NODE_ENV=production
   # 添加密码加密盐值 (使用强随机值替换)
   PASSWORD_SALT=your-strong-secret-salt-for-production
   EOL
   ```

2. **安装依赖并构建**

   ```bash
   # 安装依赖
   npm ci
   
   # 清除旧的构建文件
   rm -rf .next
   
   # 构建生产版本
   npm run build
   ```

3. **验证构建**

   ```bash
   # 启动生产服务器进行测试
   npm start
   ```

   访问 http://localhost:3000 验证应用是否正常工作。

## 创建部署包

创建一个优化的部署包，仅包含生产环境必需的文件：

```bash
# 创建部署目录
mkdir -p deploy

# 复制必要文件
cp -r .next deploy/
cp -r public deploy/
cp package.json deploy/
cp package-lock.json deploy/
cp next.config.js deploy/
cp .env.production deploy/

# 创建数据目录
mkdir -p deploy/data

# 压缩部署包
tar -czvf clipboard-production.tar.gz deploy/
```

生成的 `clipboard-production.tar.gz` 文件包含了所有部署所需的文件。

## 生产服务器配置

### 前提条件
- Linux 服务器 (推荐 Ubuntu 20.04/22.04 LTS)
- Node.js 18.17+
- Nginx
- PM2 (用于进程管理)

### 安装必要软件

```bash
# 更新系统
sudo apt update
sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Nginx
sudo apt install -y nginx

# 安装 PM2
sudo npm install -g pm2
```

### 部署应用

1. **上传部署包**

   将 `clipboard-production.tar.gz` 上传到服务器：
   ```bash
   scp clipboard-production.tar.gz user@your-server-ip:/tmp/
   ```

2. **解压并配置**

   ```bash
   # 在服务器上执行
   cd /var/www
   sudo mkdir -p clipboard-share
   sudo tar -xzvf /tmp/clipboard-production.tar.gz -C /var/www/clipboard-share --strip-components=1
   
   # 设置权限
   sudo chown -R www-data:www-data /var/www/clipboard-share
   sudo chmod 755 /var/www/clipboard-share/data
   
   # 安装生产依赖
   cd /var/www/clipboard-share
   sudo npm install --production
   ```

## Nginx 配置

创建 Nginx 服务器配置：

```bash
sudo nano /etc/nginx/sites-available/clipboard-share
```

添加以下配置内容：

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
        alias /var/www/clipboard-share/.next/static/;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
    
    # 为 public 目录中的静态资源设置长缓存
    location /images/ {
        alias /var/www/clipboard-share/public/images/;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
    
    # favicon 缓存
    location = /favicon.ico {
        alias /var/www/clipboard-share/public/favicon.ico;
        expires 30m;
        add_header Cache-Control "public, max-age=1800";
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
        
        # API 请求不缓存
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
        
        # 启用缓存
        proxy_cache clipboard_cache;
        proxy_cache_valid 200 10m;  # 成功响应缓存10分钟
        proxy_cache_bypass $http_cache_control;
        add_header X-Cache-Status $upstream_cache_status;
        
        # 允许在更新缓存时使用过期缓存
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        
        # 针对SEO优化，确保搜索引擎可以正确索引
        add_header X-Robots-Tag "index, follow";
    }
}
```

启用配置并重启 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/clipboard-share /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl restart nginx
```

## 应用启动与管理

使用 PM2 管理应用：

```bash
# 切换到应用目录
cd /var/www/clipboard-share

# 启动应用
sudo -u www-data pm2 start npm --name "clipboard-share" -- start

# 设置开机自启
sudo -u www-data pm2 save
sudo pm2 startup
sudo systemctl enable pm2-www-data
```

常用 PM2 命令：

```bash
# 重启应用
pm2 restart clipboard-share

# 查看日志
pm2 logs clipboard-share

# 监控应用状态
pm2 monit
```

## SSL 配置

使用 Let's Encrypt 配置 HTTPS：

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

## 维护与更新

### 更新应用

当有新版本需要部署时：

1. 在本地编译新版本并创建部署包
2. 上传部署包到服务器
3. 备份当前数据
4. 解压新版本到临时目录
5. 替换旧文件并保留数据目录
6. 重启应用

示例脚本：

```bash
#!/bin/bash
# 更新脚本 - 在服务器上执行

# 备份当前数据
sudo cp -r /var/www/clipboard-share/data /var/www/data-backup-$(date +%Y%m%d)

# 解压新版本到临时目录
sudo mkdir -p /tmp/clipboard-new
sudo tar -xzvf /tmp/clipboard-production.tar.gz -C /tmp/clipboard-new --strip-components=1

# 停止应用
sudo -u www-data pm2 stop clipboard-share

# 替换应用文件，保留数据目录
sudo rsync -av --exclude='data/' /tmp/clipboard-new/ /var/www/clipboard-share/

# 安装依赖
cd /var/www/clipboard-share
sudo npm install --production

# 重启应用
sudo -u www-data pm2 restart clipboard-share

# 清理
sudo rm -rf /tmp/clipboard-new
```

### 定期备份

创建定期备份的 cron 任务：

```bash
# 编辑crontab
sudo crontab -e

# 添加每日备份任务 (凌晨3点)
0 3 * * * tar -czf /var/backups/clipboard-data-$(date +\%Y\%m\%d).tar.gz /var/www/clipboard-share/data && find /var/backups/clipboard-data-* -mtime +7 -delete
```

## 故障排除

### 应用无法启动

检查日志：

```bash
pm2 logs clipboard-share
```

常见问题解决方案：
- 端口冲突：检查 3000 端口是否被占用
- 权限问题：确保 data 目录有正确的读写权限
- 环境变量：检查 .env.production 文件是否存在且正确

### Nginx 无法代理请求

检查 Nginx 错误日志：

```bash
sudo tail -f /var/log/nginx/error.log
```

如果看到"Connection refused"错误，确保 Node.js 应用正在运行。

### 内存不足

如果服务器内存较小，可以优化 Node.js 内存使用：

```bash
# 使用内存限制启动应用
sudo -u www-data pm2 start npm --name "clipboard-share" -- start -- --max-old-space-size=256
```

---

如有其他部署或维护问题，请参考:
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx 文档](https://nginx.org/en/docs/) 