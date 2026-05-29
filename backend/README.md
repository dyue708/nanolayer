# Nanolayer Backend

后端 API 服务：图片生成与编辑、历史记录、成本统计；支持 **fal.ai** 与 **Google Vertex AI** 双调用源；可选飞书租户登录与阿里云 OSS 存储。

## 环境要求

- Node.js >= 18
- npm 或 yarn

## 安装

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env，至少配置 FAL_KEY；使用 Vertex / OSS / 飞书时见下方说明
```

## 架构概览

| 模块 | 说明 |
|------|------|
| `falService` | 通过 `@fal-ai/client` 调用 fal.ai（全部图像模型） |
| `vertexService` | 通过 `@google/genai` 直连 Vertex AI（仅 Nano Banana 系列） |
| `costService` | 按模型与分辨率计算单次调用成本（美元） |
| `ossService` | 可选：生成结果上传阿里云 OSS |
| `dbService` | SQLite / PostgreSQL 历史与用户 |
| `feishuTenantService` | 可选：飞书 OAuth 与租户校验 |

**AI 调用源**（请求体 `aiSource`）：

| 源 | 值 | 适用模型 |
|----|-----|----------|
| fal.ai | `fal`（默认） | 全部：`nano-banana`、`nano-banana-pro`、`nano-banana-2`、`gpt-image-1.5`、`gpt-image-2` |
| Vertex AI | `vertex` | 仅 Nano Banana 三档；历史记录中 `model` 为 `vertex/<name>` |

新增模型步骤见仓库根目录 [`docs/ADD_MODEL.md`](../docs/ADD_MODEL.md)。

## 配置

完整变量见 [`.env.example`](./.env.example)。按功能分组如下。

### 服务器

```bash
PORT=3000
FRONTEND_URL=http://localhost:5173   # CORS；飞书 OAuth 回调为 FRONTEND_URL/（飞书后台填同一地址）
# LOG_DIR=./logs                     # 可选，应用日志目录
```

### 数据库

#### SQLite（默认）

无需额外配置，数据库文件自动创建在 `data/nanolayer.db`。

#### PostgreSQL

```bash
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nanolayer
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
# DB_FORCE_IPV4=true                # 部分云数据库需要
```

SQLite → PostgreSQL 迁移：

```bash
npm run migrate:sqlite-to-postgres
```

### Fal AI（必填，除非仅使用 Vertex）

```bash
FAL_KEY=your_fal_api_key
```

### Google Vertex AI（可选）

启用 `aiSource: 'vertex'` 时需配置：

```bash
VERTEX_AI_PROJECT=your-gcp-project-id
VERTEX_AI_LOCATION=us-east5          # 或 global 等支持图像生成的区域
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# 或使用 VERTEX_KEY_PATH（相对 backend 根目录的路径亦可）
```

服务账号需 **Vertex AI User** 角色。

**默认模型映射**（可用环境变量覆盖）：

| 产品档位 | 环境变量 | 默认 Vertex 模型 ID |
|----------|----------|---------------------|
| nano-banana | `VERTEX_MODEL_NANO_BANANA` | `gemini-2.5-flash-image` |
| nano-banana-pro | `VERTEX_MODEL_NANO_BANANA_PRO` | `gemini-3-pro-image-preview` |
| nano-banana-2 | `VERTEX_MODEL_NANO_BANANA_2` | `gemini-3.1-flash-image-preview` |

### 阿里云 OSS（可选）

未配置或上传失败时，接口仍返回 fal/Vertex 原始 URL 或 base64。

```bash
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your_bucket_name
```

### 成本配置（美元 / 张）

用于历史记录中的 `cost` 字段，便于内部统计；与 fal/Vertex 官方账单近似，可按 [Gemini 定价](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing#gemini-models-3) 调整。

```bash
# fal 源
COST_NANO_BANANA=0.0396
COST_NANO_BANANA_PRO=0.134
COST_NANO_BANANA_EDIT=0.0396
COST_NANO_BANANA_PRO_EDIT=0.134
# nano-banana-2 另有分辨率倍率，见 costService.ts

# Vertex 源（需与 VERTEX_MODEL_* 档位一致）
COST_VERTEX_NANO_BANANA=0.039
COST_VERTEX_NANO_BANANA_EDIT=0.039
COST_VERTEX_NANO_BANANA_PRO=0.134
COST_VERTEX_NANO_BANANA_PRO_EDIT=0.134
COST_VERTEX_NANO_BANANA_2=0.067
COST_VERTEX_NANO_BANANA_2_EDIT=0.067
```

### 飞书认证（可选）

配置 `FEISHU_ALLOWED_TENANT_KEY` 后，`/api/images`（除 `/proxy`）、`/api/analysis` 需携带 `Authorization: Bearer <应用会话 token>`。OAuth 换票成功后由后端签发会话（默认 **24 小时**），此期间重复打开页面无需再次飞书授权。

```bash
FEISHU_APP_ID=...
FEISHU_APP_SECRET=...
FEISHU_ALLOWED_TENANT_KEY=your_tenant_key    # 多个租户英文逗号分隔
FEISHU_SESSION_SECRET=...                    # 建议配置；用于签名会话 token
# FEISHU_SESSION_TTL_SECONDS=86400           # 可选，默认 24h
# FEISHU_REDIRECT_URI=...   # 可选，仅当与 FRONTEND_URL/ 不一致时
```

OAuth 回调地址由 `FRONTEND_URL` 自动推导（末尾加 `/`），前端通过 `GET /api/auth/feishu/status` 的 `redirectUri` 与后端、飞书后台保持一致；一般无需再配 `VITE_FEISHU_REDIRECT_URI`。

## 运行

**开发：**

```bash
npm run dev
```

**生产：**

```bash
npm run build
npm start
```

**PM2（集群）：**

```bash
npm run build
pm2 start ecosystem.config.js
```

默认监听 `http://localhost:3000`（或 `PORT`）。

## API 端点

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务状态 |

### 认证（飞书，可选）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/feishu/status` | 是否强制登录、`appId` |
| POST | `/api/auth/feishu/exchange` | OAuth `code` 换应用会话 token（默认 24h） |
| GET | `/api/auth/feishu/me` | 校验 Bearer 会话 token，返回用户信息 |

### 图片

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/images/proxy?url=` | 否 | 代理 OSS/外链图片（供 `<img>` 使用） |
| POST | `/api/images/generate` | 按需 | 文生图或编辑 |
| GET | `/api/images/history` | 按需 | 分页历史；`onlyMine=1` 仅当前用户 |
| GET | `/api/images/:id` | 按需 | 单条详情 |

**`POST /api/images/generate` 主要字段：**

```json
{
  "prompt": "描述",
  "model": "fal-ai/nano-banana",
  "aiSource": "fal",
  "imageBase64": "data:image/png;base64,...",
  "aspectRatio": "1:1",
  "resolution": "1K",
  "systemInstruction": "可选"
}
```

- 带 `imageBase64` 时为编辑模式；历史 `model` 会带 `/edit` 后缀。
- `aiSource: "vertex"` 时仅 `nano-banana` / `nano-banana-pro` / `nano-banana-2` 有效。
- 响应含 `imageUrl`（代理 URL）、`cost`、`imageId`、`width` / `height` 等。

### 分析（预留）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/analysis/analyze` | 图片分析（按需实现） |

## 目录结构

```
backend/
├── src/
│   ├── app.ts                 # Express 入口
│   ├── routes/                # images、auth、analysis
│   ├── services/              # fal、vertex、oss、db、cost、feishu
│   ├── middleware/            # 飞书租户校验
│   └── config/                # 数据库连接
├── data/                      # SQLite 数据（默认）
├── logs/                      # 运行日志（app.log、error.log）
├── scripts/                   # 数据迁移等
├── .env.example
└── ecosystem.config.js        # PM2 配置
```

## 数据库

- **SQLite**（默认）：`data/nanolayer.db`
- **PostgreSQL**：`DB_TYPE=postgres`

两种库表结构一致，通过 `DB_TYPE` 切换。历史表会记录 `model`（含 `fal-ai/...` 或 `vertex/...` 前缀）、`cost`、尺寸与元数据。

## 相关文档

- [新增模型操作说明](../docs/ADD_MODEL.md)（含 Vertex 定价与映射流程）
- [用户使用指南](../USER_GUIDE.md)（前端与 Vertex 源切换）
