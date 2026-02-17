# xiaohongshu-ops 系统设计

> 日期: 2026-02-16
> 状态: 已批准

## 定位

小红书内容运营平台——从创作到发布到数据追踪的全流程管理。

## 技术栈

- **前端/后端**: Next.js 15 (App Router)
- **数据库**: Supabase (PostgreSQL + Storage)
- **部署**: Docker 自托管
- **认证**: 单用户，Bearer token 登录

## 核心模块

### 1. 内容管理

- 文章 CRUD，Markdown 编辑器
- 状态流转：草稿 → 待审核 → 已发布 → 已归档
- 版本历史：每次保存生成版本快照，可对比/回滚
- 标签/分类管理（AI工具、新闻、教程等）

### 2. 图片管理

- 上传到 Supabase Storage
- 支持批量上传、排序、预览
- 图片与文章关联（一篇文章对应多张 slide）
- 缩略图自动生成

### 3. 发布流水线

- 文案完成 → 标记"待渲染"
- 渲染完成上传图片 → 标记"待审核"
- 审核通过 → 调用 xiaohongshu-mcp 发布
- 发布成功 → 记录小红书 note_id，标记"已发布"

### 4. 数据运营

- Dashboard：已发/待发/草稿数量
- 每篇文章关联发布后数据（阅读、点赞、收藏、评论——手动录入或后续接 API 抓取）
- 选题日历：规划未来内容排期

### 5. REST API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/articles | 创建文章 |
| PUT | /api/articles/:id | 更新文章 |
| GET | /api/articles | 列表查询（支持状态/标签筛选） |
| GET | /api/articles/:id | 文章详情 |
| GET | /api/articles/:id/versions | 版本历史 |
| POST | /api/articles/:id/images | 上传图片 |
| PUT | /api/articles/:id/status | 状态流转 |
| POST | /api/articles/:id/publish | 触发发布 |

所有接口 Bearer token 认证。

## 数据模型

```sql
-- 文章主表
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT, -- Markdown
  status TEXT NOT NULL DEFAULT 'draft', -- draft/pending_render/pending_review/published/archived
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  xhs_note_id TEXT, -- 小红书发布后的 note id
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 版本历史
CREATE TABLE article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  version_num INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 文章图片
CREATE TABLE article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT, -- Supabase Storage 路径
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 数据统计
CREATE TABLE article_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  favorites INT DEFAULT 0,
  comments INT DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);
```

## 部署架构

```
docker-compose.yml
├── xhs-ops-app (Next.js, port 3000)
├── supabase-db (PostgreSQL, port 5432)
├── supabase-storage (MinIO/S3 compatible)
└── nginx (反代 + HTTPS, port 443)
```

## Kupo 集成

我（Kupo）通过 REST API 与系统交互：
1. 创作文案后 → `POST /api/articles` 创建草稿
2. 渲染图片后 → `POST /api/articles/:id/images` 上传 slides
3. 用户确认后 → `PUT /api/articles/:id/status` 推进状态
4. 发布完成后 → `POST /api/articles/:id/publish` 记录 note_id

## 后续扩展（不在 v1 范围）

- 自动抓取小红书数据（阅读/点赞/收藏）
- AI 选题推荐
- 多账号管理
- 评论自动回复
