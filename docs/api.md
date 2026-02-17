# xiaohongshu-ops API 接口文档

> 版本: v1
> 基础路径: `/api`
> 认证方式: Bearer Token

---

## 认证

除图片代理接口外，所有接口均需要 Bearer Token 认证。

**请求头:**

```
Authorization: Bearer <API_AUTH_TOKEN>
```

未认证或 Token 无效时返回:

```json
// 401 Unauthorized
{ "error": "Unauthorized" }
```

---

## 响应格式

**成功:**

```json
{ "data": { ... } }
```

**失败:**

```json
{ "error": "错误描述" }
```

---

## 数据模型

### Article

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| title | string | 标题 |
| content | string \| null | Markdown 正文 |
| status | ArticleStatus | 状态 |
| tags | string[] | 标签数组 |
| category | string \| null | 分类 |
| xhs_note_id | string \| null | 小红书笔记 ID |
| created_at | ISO 8601 | 创建时间 |
| updated_at | ISO 8601 | 更新时间 |

### ArticleStatus

```
draft → pending_render → pending_review → published → archived
```

可选值: `draft` | `pending_render` | `pending_review` | `published` | `archived`

**状态流转规则:**

| 当前状态 | 允许流转到 |
|----------|-----------|
| draft | pending_render, archived |
| pending_render | pending_review, draft, archived |
| pending_review | published, pending_render, archived |
| published | archived |
| archived | draft |

### ArticleVersion

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| article_id | UUID | 关联文章 ID |
| title | string | 该版本标题 |
| content | string \| null | 该版本正文 |
| version_num | number | 版本号（从 1 开始递增） |
| created_at | ISO 8601 | 创建时间 |

### ArticleImage

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| article_id | UUID | 关联文章 ID |
| url | string | 图片公开访问 URL |
| storage_path | string \| null | Supabase Storage 内部路径 |
| sort_order | number | 排序序号（升序） |
| created_at | ISO 8601 | 创建时间 |

### ArticleStats

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| article_id | UUID | 关联文章 ID |
| views | number | 浏览量 |
| likes | number | 点赞数 |
| favorites | number | 收藏数 |
| comments | number | 评论数 |
| recorded_at | ISO 8601 | 记录时间 |

---

## 接口列表

### 1. 获取文章列表

```
GET /api/articles
```

**查询参数:**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| status | string | 否 | - | 按状态筛选 |
| tag | string | 否 | - | 按标签筛选 |
| category | string | 否 | - | 按分类筛选 |
| search | string | 否 | - | 模糊搜索标题和正文 |
| limit | number | 否 | 50 | 每页条数 |
| offset | number | 否 | 0 | 偏移量 |

**响应: 200**

```json
{
  "data": {
    "articles": [Article],
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

**示例:**

```bash
# 获取所有草稿
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/articles?status=draft"

# 搜索包含"AI工具"的文章
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/articles?search=AI工具&limit=10"
```

---

### 2. 创建文章

```
POST /api/articles
```

**请求体:**

```json
{
  "title": "文章标题",        // 必填
  "content": "Markdown 正文", // 可选
  "tags": ["AI", "教程"],     // 可选
  "category": "AI工具"        // 可选
}
```

**响应: 201**

```json
{
  "data": Article
}
```

新文章初始状态为 `draft`，同时自动创建 v1 版本。

**示例:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"5个AI工具推荐","content":"# 正文\n内容...","tags":["AI","工具"]}' \
  "http://localhost:3001/api/articles"
```

---

### 3. 获取文章详情

```
GET /api/articles/:id
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**响应: 200**

```json
{
  "data": Article
}
```

**错误:**

| 状态码 | 说明 |
|--------|------|
| 404 | 文章不存在 |

---

### 4. 更新文章

```
PUT /api/articles/:id
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**请求体（均为可选，仅传需要更新的字段）:**

```json
{
  "title": "新标题",
  "content": "新正文",
  "tags": ["新标签"],
  "category": "新分类"
}
```

**响应: 200**

```json
{
  "data": Article
}
```

如果 `title` 或 `content` 有变更，会自动创建新版本。

**错误:**

| 状态码 | 说明 |
|--------|------|
| 404 | 文章不存在 |

---

### 5. 删除文章

```
DELETE /api/articles/:id
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**响应: 200**

```json
{
  "data": {
    "message": "文章已删除"
  }
}
```

删除文章时，关联的版本、图片、统计数据会级联删除（数据库外键 ON DELETE CASCADE）。

---

### 6. 获取文章状态及允许的流转

```
GET /api/articles/:id/status
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**响应: 200**

```json
{
  "data": {
    "current_status": "draft",
    "allowed_next_statuses": ["pending_render", "archived"]
  }
}
```

---

### 7. 更新文章状态

```
PUT /api/articles/:id/status
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**请求体:**

```json
{
  "status": "pending_render"  // 必填，目标状态
}
```

**响应: 200**

```json
{
  "data": {
    "article": Article,
    "previous_status": "draft",
    "new_status": "pending_render"
  }
}
```

**错误:**

| 状态码 | 说明 |
|--------|------|
| 400 | 不允许的状态流转，会返回允许的目标状态列表 |
| 404 | 文章不存在 |

**示例:**

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending_render"}' \
  "http://localhost:3001/api/articles/<article-id>/status"
```

---

### 8. 发布文章到小红书

```
POST /api/articles/:id/publish
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**请求体:**

```json
{
  "xhs_note_id": "abc123def456",  // 必填，小红书笔记 ID
  "views": 0,                      // 可选，初始浏览量
  "likes": 0,                      // 可选，初始点赞数
  "favorites": 0,                  // 可选，初始收藏数
  "comments": 0                    // 可选，初始评论数
}
```

**响应: 200**

```json
{
  "data": {
    "article": Article,
    "message": "文章发布成功"
  }
}
```

此接口会：
1. 将文章状态更新为 `published`
2. 记录小红书 `xhs_note_id`
3. 如果提供了统计数据，创建初始 `article_stats` 记录

**错误:**

| 状态码 | 说明 |
|--------|------|
| 400 | 缺少 xhs_note_id |
| 404 | 文章不存在 |

---

### 9. 获取文章图片列表

```
GET /api/articles/:id/images
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**响应: 200**

```json
{
  "data": {
    "article_id": "uuid",
    "images": [ArticleImage],
    "total": 5
  }
}
```

图片按 `sort_order` 升序排列。

---

### 10. 上传文章图片

```
POST /api/articles/:id/images
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**请求体: multipart/form-data**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 图片文件 |
| sort_order | string | 否 | 排序序号，默认 0 |

**响应: 201**

```json
{
  "data": ArticleImage
}
```

文件存储路径格式: `{article_id}/{timestamp}-{random}.{extension}`

**错误:**

| 状态码 | 说明 |
|--------|------|
| 400 | 缺少文件 |
| 404 | 文章不存在 |

**示例:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "file=@slide1.png" \
  -F "sort_order=1" \
  "http://localhost:3001/api/articles/<article-id>/images"
```

---

### 11. 删除文章图片

```
DELETE /api/articles/:id/images?image_id=<image-uuid>
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**查询参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_id | UUID | 是 | 要删除的图片 ID |

**响应: 200**

```json
{
  "data": {
    "message": "图片已删除"
  }
}
```

同时删除 Supabase Storage 中的文件和数据库记录。

**错误:**

| 状态码 | 说明 |
|--------|------|
| 400 | 缺少 image_id 参数 |
| 404 | 图片不存在或不属于该文章 |

---

### 12. 获取文章版本历史

```
GET /api/articles/:id/versions
```

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 文章 ID |

**响应: 200**

```json
{
  "data": {
    "article_id": "uuid",
    "versions": [ArticleVersion],
    "total": 3
  }
}
```

版本按 `version_num` 降序排列（最新版在前）。

**错误:**

| 状态码 | 说明 |
|--------|------|
| 404 | 文章不存在 |

---

### 13. 图片代理

```
GET /api/images/{path}
```

**无需认证**，公开访问。

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| path | string | 存储路径（支持多层级），如 `{article_id}/{filename}` |

**响应: 200**

- **Content-Type**: 根据文件类型自动判断，默认 `image/png`
- **Cache-Control**: `public, max-age=31536000, immutable`（缓存 1 年）
- **Body**: 二进制图片数据

**错误:**

| 状态码 | 说明 |
|--------|------|
| 404 | 图片不存在 |

**示例:**

```
http://localhost:3001/api/images/abc-123/1708123456-xyz.png
```

---

## 完整工作流示例

以下是一篇文章从创建到发布的完整流程:

```bash
TOKEN="your-bearer-token"
BASE="http://localhost:3001/api"

# 1. 创建草稿
ARTICLE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"5个超好用的AI工具","content":"# 推荐\n...","tags":["AI","工具"]}' \
  "$BASE/articles")
ID=$(echo $ARTICLE | jq -r '.data.id')

# 2. 上传图片（多张 slide）
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "file=@slide1.png" -F "sort_order=1" \
  "$BASE/articles/$ID/images"

curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "file=@slide2.png" -F "sort_order=2" \
  "$BASE/articles/$ID/images"

# 3. 流转到待渲染
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending_render"}' \
  "$BASE/articles/$ID/status"

# 4. 渲染完成，流转到待审核
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending_review"}' \
  "$BASE/articles/$ID/status"

# 5. 审核通过，发布到小红书
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"xhs_note_id":"note_abc123"}' \
  "$BASE/articles/$ID/publish"

# 6. 查看版本历史
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/articles/$ID/versions"
```

---

## 数据库表结构

### articles

| 列 | 类型 | 约束 | 默认值 |
|----|------|------|--------|
| id | UUID | PRIMARY KEY | gen_random_uuid() |
| title | TEXT | NOT NULL | - |
| content | TEXT | - | NULL |
| status | TEXT | NOT NULL | 'draft' |
| tags | TEXT[] | - | '{}' |
| category | TEXT | - | NULL |
| xhs_note_id | TEXT | - | NULL |
| created_at | TIMESTAMPTZ | - | now() |
| updated_at | TIMESTAMPTZ | - | now()（触发器自动更新） |

索引: `status`, `created_at DESC`, `xhs_note_id`

### article_versions

| 列 | 类型 | 约束 | 默认值 |
|----|------|------|--------|
| id | UUID | PRIMARY KEY | gen_random_uuid() |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | - |
| title | TEXT | NOT NULL | - |
| content | TEXT | - | NULL |
| version_num | INT | NOT NULL | - |
| created_at | TIMESTAMPTZ | - | now() |

索引: `(article_id, version_num DESC)`

### article_images

| 列 | 类型 | 约束 | 默认值 |
|----|------|------|--------|
| id | UUID | PRIMARY KEY | gen_random_uuid() |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | - |
| url | TEXT | NOT NULL | - |
| storage_path | TEXT | - | NULL |
| sort_order | INT | - | 0 |
| created_at | TIMESTAMPTZ | - | now() |

索引: `(article_id, sort_order)`

### article_stats

| 列 | 类型 | 约束 | 默认值 |
|----|------|------|--------|
| id | UUID | PRIMARY KEY | gen_random_uuid() |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | - |
| views | INT | - | 0 |
| likes | INT | - | 0 |
| favorites | INT | - | 0 |
| comments | INT | - | 0 |
| recorded_at | TIMESTAMPTZ | - | now() |

索引: `(article_id, recorded_at DESC)`
