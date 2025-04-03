#!/bin/bash

# 显示正在执行的命令
set -x

# 安装依赖
npm install

# 创建必要的目录
mkdir -p data
chmod 777 data

# 构建应用
npm run build

# 输出构建结果
echo "构建完成！"
echo "使用 'npm start' 启动应用" 