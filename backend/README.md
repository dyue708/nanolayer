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
2. 填写必要的环境变量

### 数据库配置

#### SQLite（默认）

默认使用 SQLite 数据库，无需额外配置。数据库文件会自动创建在 `data/nanolayer.db`。

#### PostgreSQL

如果需要使用 PostgreSQL，请设置以下环境变量：

```bash
# 数据库类型
DB_TYPE=postgres

# PostgreSQL 连接配置
DB_HOST=localhost          # 数据库主机地址
DB_PORT=5432               # 数据库端口（默认 5432）
DB_NAME=nanolayer          # 数据库名称
DB_USER=postgres           # 数据库用户名
DB_PASSWORD=your_password  # 数据库密码
DB_SSL=false               # 是否使用 SSL（生产环境建议设为 true）
```

**PostgreSQL 安装和设置：**

1. 安装 PostgreSQL（如果尚未安装）：
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS (使用 Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # Windows
   # 从 https://www.postgresql.org/download/windows/ 下载安装
   ```

2. 创建数据库和用户：
   ```bash
   # 登录 PostgreSQL
   sudo -u postgres psql
   
   # 创建数据库
   CREATE DATABASE nanolayer;
   
   # 创建用户（可选）
   CREATE USER nanolayer_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE nanolayer TO nanolayer_user;
   
   # 退出
   \q
   ```

3. 在 `.env` 文件中配置连接信息

### 其他配置

```bash
# Fal AI 平台 API Key
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

# 前端 URL（用于 CORS 配置）
FRONTEND_URL=http://localhost:5173
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

支持两种数据库类型：

- **SQLite**（默认）：无需额外配置，数据库文件存储在 `data/nanolayer.db`
- **PostgreSQL**：通过设置 `DB_TYPE=postgres` 和相关环境变量来使用

数据库类型通过 `DB_TYPE` 环境变量选择，默认为 `sqlite`。两种数据库使用相同的表结构，可以无缝切换。

