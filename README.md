# Nanolayer Studio

> 基于 AI 的图片生成和编辑工具，支持文本生成图片和图片编辑功能。

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install
cd backend && npm install && cd ..

# 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 填写配置

# 启动后端
cd backend
npm run dev

# 启动前端（新终端）
npm run dev
```

访问 http://localhost:5173

### 生产部署

详细部署文档请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 项目结构

```
nanolayer/
├── backend/          # 后端 API 服务
│   ├── src/         # 源代码
│   ├── data/        # 数据库文件
│   └── dist/        # 编译输出
├── components/       # React 组件
├── services/         # 前端服务
└── dist/            # 前端构建输出
```

## 功能特性

- 🎨 文本生成图片（Text-to-Image）
- ✏️ 图片编辑（Image-to-Image）
- 📚 历史记录查看
- 💰 成本统计
- 🌐 多语言支持

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite / PostgreSQL
- **存储**: 阿里云 OSS
- **AI 服务**: FAL Platform

## 文档

- [部署文档](./DEPLOYMENT.md) - 生产环境部署指南
- [用户使用手册](./USER_GUIDE.md) - 页面功能与操作指南
- [后端 README](./backend/README.md) - 后端 API 文档

## 许可证

MIT License

---

# Nanolayer Studio

前后端分离的 AI 图片生成和编辑工具。

## 项目结构

```
nanolayer/
├── backend/          # 后端 API 服务
├── components/       # React 组件
├── services/         # 前端服务（API 调用）
├── utils/           # 工具函数
└── ...
```

## 快速开始

### 后端

1. 进入后端目录：
```bash
cd backend
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量（复制 `.env.example` 为 `.env` 并填写）

4. 启动后端：
```bash
npm run dev
```

后端将在 `http://localhost:3000` 运行

### 前端

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

前端将在 `http://localhost:5173` 运行

## 功能特性

- ✅ 图片生成（text-to-image）
- ✅ 图片编辑（image-to-image）
- ✅ 区域选择编辑（Touch Edit）
- ✅ 参考图片支持
- ✅ 历史图片查看
- ✅ 成本统计
- ✅ 多语言支持（中英文）

## 技术栈

- **前端**: React + Vite + TypeScript
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite
- **AI 平台**: fal.ai (nano-banana)
- **存储**: 阿里云 OSS
