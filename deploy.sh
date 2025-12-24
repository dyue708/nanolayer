#!/bin/bash

# Nanolayer 部署脚本
# 使用方法: ./deploy.sh [production|development]

set -e

ENV=${1:-production}
echo "部署环境: $ENV"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js，请先安装 Node.js >= 18${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}错误: Node.js 版本需要 >= 18，当前版本: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本检查通过${NC}"

# 部署后端
echo -e "\n${YELLOW}开始部署后端...${NC}"
cd backend

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}警告: .env 文件不存在，从 .env.example 复制${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}请编辑 .env 文件填写配置${NC}"
    else
        echo -e "${RED}错误: .env.example 文件不存在${NC}"
        exit 1
    fi
fi

# 安装依赖
echo "安装后端依赖..."
npm install

# 构建
if [ "$ENV" = "production" ]; then
    echo "构建后端..."
    npm run build
fi

# 创建日志目录
mkdir -p logs
mkdir -p data

cd ..

# 部署前端
echo -e "\n${YELLOW}开始部署前端...${NC}"

# 检查 .env.production 文件
if [ ! -f .env.production ] && [ "$ENV" = "production" ]; then
    echo -e "${YELLOW}警告: .env.production 文件不存在${NC}"
    echo "创建 .env.production 文件..."
    echo "VITE_API_BASE_URL=/api" > .env.production
fi

# 安装依赖
echo "安装前端依赖..."
npm install

# 构建
if [ "$ENV" = "production" ]; then
    echo "构建前端..."
    npm run build
    echo -e "${GREEN}✓ 前端构建完成${NC}"
fi

# PM2 部署（如果使用 PM2）
if command -v pm2 &> /dev/null && [ "$ENV" = "production" ]; then
    echo -e "\n${YELLOW}使用 PM2 启动后端...${NC}"
    cd backend
    if [ -f ecosystem.config.js ]; then
        pm2 start ecosystem.config.js
        pm2 save
        echo -e "${GREEN}✓ 后端已通过 PM2 启动${NC}"
    else
        echo -e "${YELLOW}警告: ecosystem.config.js 不存在，跳过 PM2 部署${NC}"
    fi
    cd ..
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"

if [ "$ENV" = "production" ]; then
    echo -e "\n下一步："
    echo "1. 配置 Nginx（参考 nginx.conf.example）"
    echo "2. 配置 SSL 证书"
    echo "3. 启动服务"
    echo ""
    echo "前端文件位置: ./dist"
    echo "后端文件位置: ./backend/dist"
else
    echo -e "\n开发模式："
    echo "启动后端: cd backend && npm run dev"
    echo "启动前端: npm run dev"
fi

