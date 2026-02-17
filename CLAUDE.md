# CLAUDE.md — xiaohongshu-ops 项目记忆

## 项目简介

**xiaohongshu-ops** 是小红书内容运营平台，覆盖内容管理、图片上传、发布流水线和数据分析。

## 技术栈

- **前端**: Next.js 15 (App Router) + Ant Design 5 (暗色主题) + @ant-design/icons
- **后端**: Next.js API Routes (Bearer token 单用户认证)
- **数据库/存储**: 自托管 Supabase (PostgreSQL + Storage)
- **部署**: Docker Compose (Debian 服务器，非 Vercel)
- **UI**: 全中文、暗色主题、移动端优先响应式

## 架构

- Kupo (AI 助理) 通过 REST API 交互，Bearer token 认证
- 自托管 Supabase 全栈：db, kong, auth, rest, storage, meta, studio, imgproxy, app, nginx, mcp
- MCP Server（Streamable HTTP）让外部 AI agent 通过 MCP 协议操作文章管理
- 单用户模式，无复杂权限系统

## 端口映射

所有 HTTP 流量统一走 Nginx，DB 是 TCP 协议独立暴露：

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| Nginx | 8080 | 唯一 HTTP 入口（代理 app / kong / mcp / studio） |
| DB | 5434 | PostgreSQL TCP 直连 |

## 认证

- **API_AUTH_TOKEN**: 通过 `.env` 文件中的 `API_AUTH_TOKEN` 配置
- **JWT_SECRET**: 通过 `.env` 文件中的 `JWT_SECRET` 配置（必须与 ANON_KEY / SERVICE_ROLE_KEY 匹配）

## 数据模型

- 表: `articles`, `article_versions`, `article_images`, `article_stats`
- 状态流: draft → pending_render → pending_review → published | draft → archived
- 状态 Tag 映射: draft→default, pending_render→warning, pending_review→processing, published→success, archived→orange（antd Tag 组件）

## 设计原则

- 暗色主题（antd darkAlgorithm），品牌色 coral `#FF2442`
- PC端：经典后台布局（Layout.Sider 240px 可折叠 + Header + Content），Table 驱动列表，左右分栏编辑器/预览
- 移动端：底部 Tab 导航 + 全屏内容区，List 卡片列表，Tabs 切换编辑/预览
- 响应式断点 1024px（useIsMobile hook）

## 踩过的坑

1. **JWT_SECRET 必须精确匹配** — demo key 签名用 `your-super-secret-jwt-...`，少一个 `your-` 前缀就全挂
2. **Meta healthcheck 用 bash /dev/tcp** — Node.js 冷启动超 10s，bash TCP 检查秒过
3. **Docker build 需 .dockerignore** — 排除 `volumes/`, `.env`, `.git`, `node_modules`
4. **写入类 API 不用生产接口测试** — 读源码/文档确认参数
5. **移动端 h-16 spacer 浪费空间** — hamburger 按钮 fixed 定位，内容直接顶上去
6. **MCP session 保存时序** — `StreamableHTTPServerTransport` 的 sessionId 在 `handleRequest` 处理 initialize 后才分配，必须在 handleRequest 之后再存入 sessions Map

## 部署与自测

- 管理脚本：`./manage.sh`（init / up / down / logs / rebuild 等）
- **🚨 每次改完代码必须自测！push 后到服务器 pull + rebuild，curl 验证 API 和页面正常，不能只改代码不验证**
- 用 `curl` + Bearer token 测试 API 端点
- Docker 11 个容器全部 healthy 才算部署成功

## MCP Server

- **位置**: `mcp-server/` 子目录（独立 TypeScript 项目）
- **技术**: `@modelcontextprotocol/sdk` + Streamable HTTP 传输
- **端点**: `http://<server-ip>:8080/mcp`（通过 Nginx 代理）
- **配置**: 环境变量 `XHS_API_BASE_URL` + `XHS_API_AUTH_TOKEN` + `MCP_PORT`（容器内部端口，不暴露到主机）
- **11 个工具**: list_articles, create_article, get_article, update_article, delete_article, get_article_status, update_article_status, publish_article, list_article_images, delete_article_image, get_article_versions
- **不含图片上传**（LLM 无法提供二进制文件，通过 Web UI 上传）
- **接口文档**: `docs/api.md`
- **本地开发**: `cd mcp-server && npm run dev`
- **构建**: `cd mcp-server && npm run build && node build/index.js`

## 待办

- [ ] 域名 / SSL 配置（nginx 反向代理已就绪）
- [ ] 数据库备份策略
- [x] MCP Server 集成（AI agent 通过 MCP 协议操作文章）
- [ ] 图片上传流程（Supabase Storage）
- [ ] 数据分析 / 文章统计追踪
- [ ] 持续移动端打磨
