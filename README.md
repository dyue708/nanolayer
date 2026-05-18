# Nanolayer Studio

前后端分离的 AI 图片生成与编辑工具：文生图、图生图、局部选区编辑、多图层画布与历史记录。

## 功能特性

- 文生图 / 图生图 / 局部选区编辑（Touch Edit）
- 多图层画布、参考图、系统指令与提示词模板
- 历史记录与单次调用成本统计
- **双 AI 调用源**：fal.ai（全模型）与 Google Vertex AI（Nano Banana 系列）
- 可选阿里云 OSS 持久化、飞书租户登录
- 界面中英文切换

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React、TypeScript、Vite、Tailwind CSS |
| 后端 | Node.js、Express、TypeScript |
| 数据库 | SQLite（默认）/ PostgreSQL |
| 图像 AI | fal.ai；Vertex AI（`@google/genai`） |
| 存储 | 阿里云 OSS（可选） |
| 认证 | 飞书 OAuth（可选） |

## 项目结构

```
nanolayer/
├── backend/           # API：生成、历史、成本、认证
│   ├── src/
│   ├── data/          # SQLite（默认）
│   └── README.md      # 后端配置与 API 说明
├── components/        # React UI
├── services/          # 前端 API 封装
├── docs/              # 开发文档（如新增模型）
├── DEPLOYMENT.md      # 生产部署
└── USER_GUIDE.md      # 用户使用手册
```

## 快速开始

### 1. 安装依赖

```bash
npm install
cd backend && npm install && cd ..
```

### 2. 配置环境变量

**后端**（必填 `FAL_KEY`；Vertex / OSS / 飞书按需）：

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env
```

**前端**（启用飞书登录时）：

```bash
cp .env.example .env
# 配置 VITE_FEISHU_REDIRECT_URI，须与飞书开放平台、后端 FEISHU_REDIRECT_URI 一致
```

### 3. 启动

```bash
# 终端 1：后端 → http://localhost:3000
cd backend && npm run dev

# 终端 2：前端 → http://localhost:5173
npm run dev
```

浏览器访问 http://localhost:5173。开发模式下 Vite 会将 `/api` 代理到后端。

### 生产部署

见 [DEPLOYMENT.md](./DEPLOYMENT.md)（Docker、Nginx、PM2 等）。

## 模型与调用源

| 模型 | fal.ai | Vertex AI |
|------|:------:|:---------:|
| Nano Banana | ✅ | ✅ |
| Nano Banana Pro | ✅ | ✅ |
| Nano Banana 2 | ✅ | ✅ |
| GPT Image 1.5 / 2 | ✅ | — |

在右侧设置面板切换 **AI 调用源**；Vertex 需在后端配置 GCP 项目与服务账号，详见 [backend/README.md](./backend/README.md)。

## 文档

| 文档 | 说明 |
|------|------|
| [USER_GUIDE.md](./USER_GUIDE.md) | 页面功能与操作流程（用户向） |
| [backend/README.md](./backend/README.md) | 环境变量、API、Vertex / 飞书 / 成本配置 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 生产环境部署 |
| [docs/ADD_MODEL.md](./docs/ADD_MODEL.md) | 新增 fal / Vertex 模型开发步骤 |

## 许可证

MIT License
