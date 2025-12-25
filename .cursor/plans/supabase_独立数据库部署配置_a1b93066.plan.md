---
name: Supabase 独立数据库部署配置
overview: 修改 Docker 部署配置以支持 Supabase 数据库，使用独立端口（8080）避免与现有服务冲突，并更新部署文档。
todos:
  - id: update-docker-compose
    content: 修改 docker-compose.yml：更新端口映射（8080/3001）、添加 Supabase 环境变量、创建独立网络
    status: completed
  - id: create-nginx-docker-config
    content: 创建 nginx.conf.docker 配置文件，用于 Docker 前端容器（监听 80，代理到后端容器）
    status: completed
  - id: update-dockerfile-frontend
    content: 修改 Dockerfile.frontend 使用新的 nginx.conf.docker 配置文件
    status: completed
    dependencies:
      - create-nginx-docker-config
  - id: update-deployment-doc
    content: 更新 DEPLOYMENT.md：添加 Supabase 配置章节、更新端口说明、添加共存注意事项
    status: completed
---

# Supabase 独立数据库部署配置

## 目标

配置 nanolayer 使用 Supabase 作为独立数据库，使用独立端口（8080）避免与现有服务冲突，确保稳定部署。

## 架构调整

```javascript
现有服务 (80/443) + Nanolayer (8080)
├── 前端容器: 8080 端口
├── 后端容器: 3001 端口（内部 3000）
└── Supabase 数据库（外部云服务）
```



## 修改文件

### 1. `docker-compose.yml`

- **端口映射**：
- 前端：`8080:80`（避免与现有 nginx 冲突）
- 后端：`3001:3000`（避免端口冲突）
- **网络配置**：
- 创建新的 Docker 网络 `nanolayer-network`
- 不连接到现有 docker-compose 网络
- **环境变量**：
- 添加 Supabase 数据库配置示例
- `DB_TYPE=postgres`
- `DB_HOST`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`、`DB_PORT`、`DB_SSL`
- **健康检查**：
- 更新后端健康检查 URL

### 2. `Dockerfile.frontend`

- **Nginx 配置**：
- 创建新的 `nginx.conf.docker` 配置文件
- 监听 80 端口（容器内），映射到主机 8080
- 移除 SSL 配置（简化，或支持 HTTP）
- API 代理指向后端容器名 `nanolayer-backend:3000`

### 3. `DEPLOYMENT.md`

- **新增 Supabase 配置章节**：
- 如何获取 Supabase 连接信息
- 环境变量配置示例
- SSL 连接说明
- **更新 Docker 部署章节**：
- 端口说明（8080 前端，3001 后端）
- 与现有服务共存的注意事项
- 网络隔离说明
- **更新环境变量章节**：
- Supabase 数据库配置示例

### 4. 创建 `nginx.conf.docker`

- **新文件**：专门用于 Docker 前端的 nginx 配置
- **配置内容**：
- 监听 80 端口
- 前端静态文件服务
- `/api` 代理到 `http://nanolayer-backend:3000`
- Gzip 压缩
- SPA 路由支持

## 实施细节

### Supabase 连接配置

Supabase 使用标准 PostgreSQL 协议，需要：

- `DB_HOST`: `db.xxxxx.supabase.co`
- `DB_PORT`: `5432` 或 `6543`（连接池）
- `DB_NAME`: 通常是 `postgres`
- `DB_USER`: Supabase 项目用户名
- `DB_PASSWORD`: Supabase 数据库密码
- `DB_SSL`: `true`（Supabase 要求 SSL）

### 端口选择理由

- **8080**: 常见备用 HTTP 端口，不与现有服务冲突
- **3001**: 后端映射端口，避免与可能的其他 Node.js 服务冲突
- 容器内部仍使用标准端口（80/3000）

### 网络隔离

- 创建独立的 Docker 网络，避免与现有服务网络冲突
- 前端和后端在同一网络内通过容器名通信
- 后端通过环境变量连接外部 Supabase

## 部署步骤（更新后）

1. 配置 Supabase 数据库连接信息
2. 设置环境变量（`backend/.env`）
3. 运行 `docker-compose up -d --build`
4. 访问 `http://your-server:8080`