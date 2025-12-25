# Nanolayer 部署文档

本文档详细说明如何将 Nanolayer 项目部署到生产环境。

## 目录

- [环境要求](#环境要求)
- [部署架构](#部署架构)
- [后端部署](#后端部署)
- [前端部署](#前端部署)
- [环境变量配置](#环境变量配置)
- [数据库配置](#数据库配置)
- [OSS 配置](#oss-配置)
- [域名和 HTTPS](#域名和-https)
- [监控和日志](#监控和日志)
- [常见问题](#常见问题)

## 环境要求

### 服务器要求

- **操作系统**: Linux (推荐 Ubuntu 20.04+ 或 CentOS 7+)
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 10GB 可用空间

### 服务依赖

- **数据库**: SQLite (开发) 或 PostgreSQL (生产推荐)
- **对象存储**: 阿里云 OSS
- **反向代理**: Nginx (推荐)

## 部署架构

### Docker 部署架构（推荐）

```
┌─────────────────────────────────────┐
│   Docker 网络: nanolayer-network    │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   前端容器    │  │  后端容器    │ │
│  │  (Nginx)     │  │  (Node.js)  │ │
│  │  内部: 80    │  │  内部: 3000  │ │
│  └──────┬───────┘  └──────┬───────┘ │
│         │                 │         │
└─────────┼─────────────────┼─────────┘
          │                 │
     ┌────▼────┐       ┌────▼────┐
     │ 8080    │       │ 3001    │
     │ (主机)  │       │ (主机)  │
     └─────────┘       └─────────┘
          │                 │
          └─────────┬─────────┘
                    │
          ┌─────────▼─────────┐
          │  Supabase 数据库   │
          │  (外部云服务)      │
          └───────────────────┘
```

### 传统部署架构

```
┌─────────────┐
│   Nginx     │ (反向代理 + SSL)
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│前端 │ │后端 │
│5173 │ │3000 │
└─────┘ └─────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│SQLite │ │OSS    │
│/PostgreSQL│ │阿里云 │
└───────┘ └───────┘
```

## 后端部署

### 1. 安装依赖

```bash
cd backend
npm install --production
```

### 2. 构建项目

```bash
npm run build
```

### 3. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
cp .env.example .env
nano .env
```

### 4. 使用 PM2 管理进程（推荐）

安装 PM2：

```bash
npm install -g pm2
```

创建 PM2 配置文件 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'nanolayer-backend',
    script: './dist/app.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

启动服务：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 设置开机自启
```

### 5. 使用 systemd（可选）

创建服务文件 `/etc/systemd/system/nanolayer-backend.service`：

```ini
[Unit]
Description=Nanolayer Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/nanolayer/backend
ExecStart=/usr/bin/node dist/app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/path/to/nanolayer/backend/.env

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable nanolayer-backend
sudo systemctl start nanolayer-backend
```

## 前端部署

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.production` 文件：

```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### 3. 构建项目

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 4. 使用 Nginx 部署

创建 Nginx 配置文件 `/etc/nginx/sites-available/nanolayer`：

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL 证书配置
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # 前端静态文件
    root /path/to/nanolayer/dist;
    index index.html;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # 前端路由支持（SPA）
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理到后端
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 文件上传大小限制
        client_max_body_size 50M;
    }
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/nanolayer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. 使用 Docker 部署（推荐）

项目已包含完整的 Docker 配置文件，这是最简单的部署方式。

**使用 Docker Compose（推荐）：**

1. 配置环境变量：

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env 填写配置
```

2. 构建并启动：

```bash
docker-compose up -d --build
```

3. 查看日志：

```bash
docker-compose logs -f
```

4. 停止服务：

```bash
docker-compose down
```

**单独构建：**

后端：
```bash
docker build -f Dockerfile.backend -t nanolayer-backend ./backend
docker run -d -p 3001:3000 --env-file ./backend/.env -v $(pwd)/backend/data:/app/data nanolayer-backend
```

前端：
```bash
docker build -f Dockerfile.frontend -t nanolayer-frontend .
docker run -d -p 8080:80 nanolayer-frontend
```

**Docker 配置文件说明：**

- `Dockerfile.backend` - 后端 Docker 镜像配置
- `Dockerfile.frontend` - 前端 Docker 镜像配置
- `docker-compose.yml` - Docker Compose 编排配置
- `nginx.conf.docker` - Docker 前端容器 Nginx 配置
- `.dockerignore` - Docker 构建忽略文件

**端口说明：**

- **前端**: 8080 端口（避免与现有 Nginx 服务冲突）
- **后端**: 3001 端口（映射到容器内部 3000 端口）
- 容器内部通信通过 Docker 网络，前端通过容器名 `nanolayer-backend` 访问后端

**与现有服务共存：**

如果服务器上已有其他 Docker 服务（如 Nginx、Dify 等），Nanolayer 会：
- 使用独立的 Docker 网络 `nanolayer-network`，避免网络冲突
- 使用独立端口（8080/3001），避免端口冲突
- 不影响现有服务的运行

如需通过现有 Nginx 反向代理访问，可在现有 Nginx 配置中添加：

```nginx
location /nanolayer {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## 环境变量配置

### 后端环境变量（`backend/.env`）

```bash
# 服务器配置
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# FAL 平台配置
FAL_KEY=your_fal_api_key

# 阿里云 OSS 配置
OSS_ACCESS_KEY_ID=your_oss_key
OSS_ACCESS_KEY_SECRET=your_oss_secret
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your_bucket_name

# 飞书登录配置（可选）
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret
JWT_SECRET=your_jwt_secret

# 成本配置（每张图片的成本，单位：美元）
COST_NANO_BANANA=0.0396
COST_NANO_BANANA_PRO=0.134
COST_NANO_BANANA_EDIT=0.0396
COST_NANO_BANANA_PRO_EDIT=0.134

# GPT Image 1.5 模型成本（基于分辨率，自动计算）
# 1024x1024: $0.133
# 1024x1536 或 1536x1024: $0.200
# 其他尺寸: $0.133（默认值）
# 注意：gpt-image-1.5 的成本会根据实际生成的图片尺寸自动计算，无需手动配置

# 数据库配置（SQLite - 默认）
# DB_TYPE=sqlite

# 数据库配置（PostgreSQL - 本地或远程）
# DB_TYPE=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=nanolayer
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_SSL=false

# 数据库配置（Supabase - 推荐）
# DB_TYPE=postgres
# DB_HOST=db.xxxxx.supabase.co
# DB_PORT=5432
# # 或使用连接池（推荐）
# # DB_PORT=6543
# DB_NAME=postgres
# DB_USER=postgres.xxxxx
# DB_PASSWORD=your_supabase_password
# DB_SSL=true
```

### 前端环境变量（`.env.production`）

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

**注意**: Docker 部署时，前端容器内的 `VITE_API_BASE_URL` 应指向后端容器，但构建时需要使用实际访问地址。如果通过现有 Nginx 代理，应使用代理后的地址。

## 数据库配置

### SQLite（默认，开发环境）

无需额外配置，数据库文件自动创建在 `backend/data/nanolayer.db`。

### PostgreSQL（生产环境推荐）

1. 安装 PostgreSQL：

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

2. 创建数据库和用户：

```sql
CREATE DATABASE nanolayer;
CREATE USER nanolayer_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nanolayer TO nanolayer_user;
```

3. 配置环境变量（`backend/.env`）：

```bash
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nanolayer
DB_USER=nanolayer_user
DB_PASSWORD=your_password
DB_SSL=false
```

### Supabase（云数据库，推荐用于生产环境）

Supabase 是基于 PostgreSQL 的云数据库服务，提供自动备份、监控和管理功能。

**1. 创建 Supabase 项目：**

1. 访问 [Supabase](https://supabase.com) 并注册账号
2. 创建新项目
3. 等待项目初始化完成（约 2 分钟）

**2. 获取连接信息：**

在 Supabase 项目设置中，进入 "Database" -> "Connection string" -> "URI" 或查看 "Connection parameters"：

- **Host**: `db.xxxxx.supabase.co`
- **Port**: `5432`（直接连接）或 `6543`（连接池，推荐）
- **Database**: 通常是 `postgres`
- **User**: 项目用户名（在连接参数中显示）
- **Password**: 项目数据库密码（在项目设置中设置）

**3. 配置环境变量（`backend/.env`）：**

```bash
# 数据库类型
DB_TYPE=postgres

# Supabase 连接信息
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
# 或使用连接池（推荐，性能更好，且通常只支持 IPv4）
# DB_PORT=6543

DB_NAME=postgres
DB_USER=postgres.xxxxx  # Supabase 项目用户名
DB_PASSWORD=your_supabase_password

# Supabase 要求 SSL 连接
DB_SSL=true

# 如果遇到 IPv6 连接问题（ENETUNREACH），强制使用 IPv4
# 设置为 true 会自动将域名解析为 IPv4 地址
DB_FORCE_IPV4=true
```

**注意：IPv6 连接问题**

如果遇到 `ENETUNREACH` 错误（无法连接 IPv6 地址），可以：

1. **方法 1（推荐）**：使用连接池端口 `6543`，它通常只支持 IPv4：
   ```bash
   DB_PORT=6543
   ```

2. **方法 2**：启用 IPv4 强制解析：
   ```bash
   DB_FORCE_IPV4=true
   ```

3. **方法 3**：手动解析域名并直接使用 IPv4 地址：
   ```bash
   # 在服务器上运行：nslookup db.xxxxx.supabase.co
   # 然后使用返回的 IPv4 地址
   DB_HOST=xxx.xxx.xxx.xxx  # 使用 IPv4 地址而不是域名
   ```

**4. 验证连接：**

启动后端服务，检查日志确认连接成功：

```bash
cd backend
npm run dev
```

成功连接会显示：
```
Connected to PostgreSQL database: postgres.xxxxx@db.xxxxx.supabase.co:5432/postgres
PostgreSQL tables initialized successfully
```

**5. 迁移数据（如需要）：**

如果从 SQLite 迁移到 Supabase，使用迁移脚本：

```bash
cd backend
npx tsx scripts/migrate-sqlite-to-postgres.ts
```

**Supabase 优势：**

- ✅ 自动备份和恢复
- ✅ 实时监控和日志
- ✅ 无需维护数据库服务器
- ✅ 自动扩展
- ✅ 内置连接池（端口 6543）
- ✅ 免费额度充足（适合中小型项目）

**注意事项：**

- Supabase 要求 SSL 连接，必须设置 `DB_SSL=true`
- 建议使用连接池端口（6543）以获得更好的性能
- 生产环境建议设置强密码并启用 IP 白名单（在 Supabase 项目设置中）
- 定期检查 Supabase 项目的使用量和配额

## OSS 配置

### 1. 创建 OSS Bucket

1. 登录阿里云控制台
2. 进入 OSS 服务
3. 创建 Bucket，选择：
   - **读写权限**: 私有（推荐）或公共读
   - **区域**: 选择离服务器最近的区域

### 2. 配置 CORS（如果使用公共读）

在 OSS 控制台设置 CORS 规则：

```json
{
  "AllowedOrigins": ["https://yourdomain.com"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": [],
  "MaxAgeSeconds": 3600
}
```

### 3. 获取访问密钥

1. 进入阿里云 AccessKey 管理
2. 创建 AccessKey
3. 将 AccessKey ID 和 Secret 配置到后端 `.env` 文件

## 域名和 HTTPS

### 1. 获取 SSL 证书

推荐使用 Let's Encrypt（免费）：

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 2. 自动续期

```bash
sudo certbot renew --dry-run
```

添加到 crontab：

```bash
0 0 * * * certbot renew --quiet
```

## 监控和日志

### PM2 监控

```bash
pm2 monit
pm2 logs
```

### Nginx 日志

- 访问日志: `/var/log/nginx/access.log`
- 错误日志: `/var/log/nginx/error.log`

### 应用日志

后端日志位置：
- PM2: `backend/logs/`
- systemd: `journalctl -u nanolayer-backend`

## 性能优化

### 1. 启用 Nginx 缓存

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api {
    proxy_cache api_cache;
    proxy_cache_valid 200 60m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    # ... 其他配置
}
```

### 2. 启用 CDN

将静态资源（图片、CSS、JS）通过 CDN 分发。

### 3. 数据库优化

- 定期清理历史数据
- 为常用查询字段添加索引
- 考虑使用 PostgreSQL 替代 SQLite

## 安全建议

1. **防火墙配置**：
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **定期更新**：
   ```bash
   npm audit fix
   sudo apt-get update && sudo apt-get upgrade
   ```

3. **环境变量安全**：
   - 不要将 `.env` 文件提交到 Git
   - 使用密钥管理服务（如 AWS Secrets Manager）

4. **API 限流**：
   考虑使用 `express-rate-limit` 限制 API 请求频率

## 常见问题

### 1. 后端无法启动

- 检查端口是否被占用：`lsof -i :3000`
- 检查环境变量是否正确
- 查看日志：`pm2 logs` 或 `journalctl -u nanolayer-backend`

### 2. 前端无法访问后端 API

- 检查 Nginx 代理配置
- 检查后端 CORS 配置
- 检查防火墙设置

### 3. OSS 图片无法访问

- 检查 OSS 配置是否正确
- 检查 Bucket 权限设置
- 检查代理路由是否正常工作

### 4. 数据库连接失败

- 检查数据库文件权限
- 检查磁盘空间
- 检查数据库文件路径

## 备份和恢复

### 数据库备份

```bash
# SQLite
cp backend/data/nanolayer.db backend/data/nanolayer.db.backup

# PostgreSQL
pg_dump -U nanolayer_user nanolayer > backup.sql
```

### 恢复

```bash
# SQLite
cp backend/data/nanolayer.db.backup backend/data/nanolayer.db

# PostgreSQL
psql -U nanolayer_user nanolayer < backup.sql
```

## 快速部署脚本

项目提供了自动化部署脚本 `deploy.sh`，可以快速完成部署：

```bash
# 生产环境部署
./deploy.sh production

# 开发环境部署
./deploy.sh development
```

脚本会自动：
- ✅ 检查 Node.js 版本（>= 18）
- ✅ 检查并创建 `.env` 文件
- ✅ 安装前后端依赖
- ✅ 构建项目
- ✅ 配置 PM2（如果可用）

**注意**: Windows 系统需要手动执行脚本中的步骤，或使用 Git Bash 运行。

## 更新部署

### 前端更新

```bash
git pull
npm install
npm run build
sudo systemctl reload nginx
```

### 后端更新

```bash
cd backend
git pull
npm install
npm run build
pm2 restart nanolayer-backend
# 或
sudo systemctl restart nanolayer-backend
```

### Docker 更新

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 查看更新日志
docker-compose logs -f
```

## 联系和支持

如有问题，请查看项目 Issues 或联系开发团队。

