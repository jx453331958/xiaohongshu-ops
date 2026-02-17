# xiaohongshu-ops - 小红书通用运营后台

基于 Next.js 15 + Supabase 的现代化内容管理系统，专为小红书图文创作优化。

## 功能特性

- 📝 文章管理：创建、编辑、版本控制
- 🖼️ 图片管理：多图上传、排序、预览
- 📅 内容日历：按日期组织内容
- 🔄 状态流转：草稿 → 待审核 → 已审核 → 已发布
- 📊 数据统计：浏览、点赞、收藏、评论

## 技术栈

- **前端**：Next.js 15 (App Router), React 19, TypeScript
- **UI 组件**：Ant Design 5 (暗色主题), @ant-design/icons
- **后端**：Supabase (PostgreSQL + Auth + Storage)
- **部署**：Docker Compose, Nginx

## 快速开始

### 前置要求

- Docker & Docker Compose（生产部署）
- Node.js 24+ & npm（本地开发）

### 一键部署（Docker Compose）

所有服务已打包为 Docker 镜像，部署只需下载两个文件：

```bash
mkdir xiaohongshu-ops && cd xiaohongshu-ops
curl -LO https://raw.githubusercontent.com/jx453331958/xiaohongshu-ops/main/docker-compose.yml
curl -LO https://raw.githubusercontent.com/jx453331958/xiaohongshu-ops/main/manage.sh
chmod +x manage.sh
./manage.sh install
```

按提示完成配置（品牌名称、端口等，回车使用默认值），密钥全部自动生成。

安装完成后访问（所有 HTTP 流量统一走 Nginx）：
- 应用首页：http://localhost:8080
- Supabase Studio：http://localhost:8080/studio/
- MCP Server：http://localhost:8080/mcp（需要 Bearer Token 认证，与 API 共用 `API_AUTH_TOKEN`）

如需重新配置，运行 `./manage.sh config`。

### 本地开发

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动 Supabase（后台服务）**
   ```bash
   docker compose up -d db kong auth rest storage meta studio
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env.local
   # 使用 http://localhost:8000 作为 NEXT_PUBLIC_SUPABASE_URL
   ```

4. **运行开发服务器**
   ```bash
   npm run dev
   ```

5. **访问**
   - 应用：http://localhost:3000
   - Supabase Studio：http://localhost/studio

## 项目结构

```
xiaohongshu-ops/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── articles/      # 文章相关 API
│   ├── articles/          # 文章管理页面
│   ├── calendar/          # 内容日历
│   └── dashboard/         # 仪表盘
├── components/            # React 组件
│   ├── layouts/           # 响应式布局（PC/Mobile）
│   └── hooks/             # 自定义 Hooks
├── theme/                 # Ant Design 主题配置
├── lib/                   # 工具库
│   ├── supabase.ts        # Supabase 客户端
│   ├── auth.ts            # 认证中间件
│   └── status.ts          # 状态流转逻辑
├── types/                 # TypeScript 类型
├── supabase/              # Supabase 配置
│   └── migrations/        # 数据库迁移
├── volumes/               # Docker volumes
│   └── api/
│       └── kong.yml       # Kong API Gateway 配置
├── docker-compose.yml     # Docker Compose 配置
├── Dockerfile             # Next.js 应用镜像
├── nginx.conf             # Nginx 反向代理配置
└── .env.example           # 环境变量模板
```

## 核心服务

### Supabase 全家桶

- **PostgreSQL**：数据库（暴露到主机，默认 5434）
- **Kong**：API Gateway（容器内部）
- **GoTrue**：认证服务
- **PostgREST**：REST API
- **Storage API**：文件存储
- **Postgres Meta**：数据库管理 API
- **Studio**：管理界面（通过 Nginx 路由到 /studio）

### 应用服务

- **Next.js App**：前端应用（容器内部）
- **MCP Server**：AI Agent 接口（通过 Nginx 路由到 /mcp）
- **Nginx**：唯一 HTTP 入口（默认 8080）

## API 说明

### 认证

所有 API 请求需要在 Header 中包含：
```
Authorization: Bearer <ANON_KEY>
```

服务端 API 使用：
```
Authorization: Bearer <SERVICE_ROLE_KEY>
```

### 主要端点

- `GET /api/articles` - 获取文章列表
- `POST /api/articles` - 创建文章
- `GET /api/articles/:id` - 获取文章详情
- `PUT /api/articles/:id` - 更新文章
- `DELETE /api/articles/:id` - 删除文章
- `POST /api/articles/:id/images` - 上传图片
- `GET /api/articles/:id/versions` - 版本历史
- `PUT /api/articles/:id/status` - 状态流转
- `POST /api/articles/:id/publish` - 发布到小红书

## 数据库迁移

数据库 schema 位于 `supabase/migrations/`：

```
supabase/migrations/
├── 00_schema.sql          # 核心表结构
├── 01_auth.sql            # 认证配置
├── 02_storage.sql         # 存储桶配置
└── 03_rls.sql             # Row Level Security
```

## 环境变量说明

### 核心配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `POSTGRES_PASSWORD` | PostgreSQL 密码 | `super-secret-password` |
| `JWT_SECRET` | JWT 签名密钥 | `openssl rand -base64 32` |
| `ANON_KEY` | 匿名访问密钥 | 见 .env.example |
| `SERVICE_ROLE_KEY` | 服务端密钥 | 见 .env.example |
| `SUPABASE_PUBLIC_URL` | Supabase 公开 URL | `http://localhost:8000` |

### 品牌定制

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `APP_NAME` | 后台主名称（侧栏、登录页） | `小红书运营` |
| `APP_SHORT_NAME` | 侧栏折叠时的缩写 | `XHS` |
| `APP_SUBTITLE` | 登录页副标题 | `通用运营后台` |

修改品牌变量后运行 `./manage.sh reload` 即可生效，无需重建镜像。

### 生产部署

生产环境需要额外配置：

1. 修改所有密钥和密码
2. 设置正确的域名：
   ```
   SUPABASE_PUBLIC_URL=https://api.yourdomain.com
   SITE_URL=https://yourdomain.com
   ```
3. 配置 SSL 证书（见 nginx.conf）
4. 启用防火墙规则
5. 配置邮件服务（用于认证邮件）

## 常见问题

### 1. 数据库连接失败

确保 PostgreSQL 服务已启动：
```bash
docker compose ps db
docker compose logs db
```

### 2. Kong Gateway 502 错误

检查上游服务是否健康：
```bash
docker compose ps
docker compose logs kong
```

### 3. Next.js 构建失败

清理缓存并重新构建：
```bash
rm -rf .next node_modules
npm install
npm run build
```

### 4. 无法上传图片

确保 Storage API 运行正常：
```bash
docker compose logs storage
```

## 测试

运行端到端测试：
```bash
npm run test          # 运行所有测试
npm run test:ui       # UI 模式
npm run test:debug    # Debug 模式
```

## 许可证

MIT

## 相关文档

- [Supabase 自托管文档](https://supabase.com/docs/guides/self-hosting/docker)
- [Next.js 文档](https://nextjs.org/docs)
- [Kong Gateway 配置](https://docs.konghq.com/)
