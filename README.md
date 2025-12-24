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
