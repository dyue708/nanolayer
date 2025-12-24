# Nanolayer Backend

后端 API 服务，提供图片生成、编辑和历史查询功能。

## 环境要求

- Node.js >= 18
- npm 或 yarn

## 安装

```bash
cd backend
npm install
```

## 配置

1. 复制 `.env.example` 为 `.env`
2. 填写必要的环境变量：

```bash
# fal 平台 API Key
FAL_KEY=your_fal_api_key

# 阿里云 OSS 配置
OSS_ACCESS_KEY_ID=your_oss_key
OSS_ACCESS_KEY_SECRET=your_oss_secret
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your_bucket_name

# 成本配置（每张图片的成本，单位：美元）
COST_NANO_BANANA=0.0396
COST_NANO_BANANA_PRO=0.134
COST_NANO_BANANA_EDIT=0.0396
COST_NANO_BANANA_PRO_EDIT=0.134

# 服务器端口
PORT=3000
```

## 运行

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run build
npm start
```

## API 端点

- `POST /api/images/generate` - 生成或编辑图片
- `GET /api/images/history` - 获取历史图片列表
- `GET /api/images/:id` - 获取图片详情
- `POST /api/analysis/analyze` - 分析图片（预留）
- `GET /api/health` - 健康检查

## 数据库

使用 SQLite 数据库，数据文件存储在 `data/nanolayer.db`。

