const SKILL_TEMPLATE = `---
name: xiaohongshu-ops
description: >
  管理小红书内容运营平台的文章和模板。当用户提到创建文章、查看文章列表、
  修改文章状态、发布到小红书、管理图片、查看版本历史、管理模板等操作时触发。
  通过 REST API 调用 xiaohongshu-ops 后台。
argument-hint: "[操作描述，如：列出所有草稿、创建一篇关于AI工具的文章、查看模板列表]"
---

# 小红书内容运营

通过 xiaohongshu-ops REST API 管理小红书账号的内容创作、审核和发布流程。

## 连接信息

- **API 地址**: \`{{MCP_URL}}/api\`
- **认证方式**: 所有请求需携带 \`Authorization: Bearer <API_AUTH_TOKEN>\` 请求头
- **Content-Type**: JSON 请求使用 \`application/json\`，图片上传使用 \`multipart/form-data\`

## API 接口

### 文章 CRUD

#### 获取文章列表

\`\`\`
GET /api/articles?status=draft&tag=AI&category=教程&search=关键词&limit=20&offset=0
\`\`\`

参数（均为可选）：
- \`status\`: draft / pending_render / pending_review / published / archived
- \`tag\`: 按标签筛选
- \`category\`: 按分类筛选
- \`search\`: 按标题或内容模糊搜索
- \`limit\`（默认 50）/ \`offset\`（默认 0）: 分页

#### 创建文章

\`\`\`
POST /api/articles
Content-Type: application/json

{"title": "标题", "content": "Markdown 正文", "tags": ["AI", "工具"], "category": "分类"}
\`\`\`

- \`title\`（必填），其余可选
- 新文章初始状态为 \`draft\`，自动创建 v1 版本

#### 获取文章详情

\`\`\`
GET /api/articles/:id
\`\`\`

#### 更新文章

\`\`\`
PUT /api/articles/:id
Content-Type: application/json

{"title": "新标题", "content": "新正文", "tags": ["新标签"], "category": "新分类"}
\`\`\`

只传需要更新的字段。修改 title 或 content 会自动创建新版本。

#### 删除文章

\`\`\`
DELETE /api/articles/:id
\`\`\`

不可恢复，关联的版本、图片、统计数据一并删除。

### 状态管理

#### 获取当前状态和允许的流转

\`\`\`
GET /api/articles/:id/status
\`\`\`

返回示例：
\`\`\`json
{"current_status": "draft", "allowed_next_statuses": ["pending_render", "archived"]}
\`\`\`

#### 更新文章状态

\`\`\`
PUT /api/articles/:id/status
Content-Type: application/json

{"status": "pending_render"}
\`\`\`

**状态流转规则：**

| 当前状态 | 允许流转到 |
|----------|-----------|
| draft | pending_render, archived |
| pending_render | pending_review, draft, archived |
| pending_review | published, pending_render, archived |
| published | archived |
| archived | draft |

### 发布

#### 发布到小红书

\`\`\`
POST /api/articles/:id/publish
Content-Type: application/json

{"xhs_note_id": "note_abc123", "views": 0, "likes": 0, "favorites": 0, "comments": 0}
\`\`\`

- \`xhs_note_id\`（必填），统计字段可选
- 自动将状态设为 published

### 图片管理

#### 获取文章图片列表

\`\`\`
GET /api/articles/:id/images
\`\`\`

按 sort_order 升序返回。每张图片包含 \`html_url\`（有值表示已关联 HTML 源文件）。

#### 删除图片

\`\`\`
DELETE /api/articles/:id/images?image_id=<image-uuid>
\`\`\`

同时删除存储文件（PNG + HTML）和数据库记录。

> 注意：图片上传需通过 Web UI 完成，LLM 无法提供二进制文件。

### HTML 源文件管理

图片（PNG）由 HTML 模板渲染而来，可为每张图片关联 HTML 源文件。

#### 上传 HTML 源文件

\`\`\`
POST /api/articles/:id/images/:imageId/html
Content-Type: application/json

{"html": "<html>...</html>"}
\`\`\`

图片必须已存在且尚无 HTML 源文件。

#### 获取 HTML 源文件

\`\`\`
GET /api/articles/:id/images/:imageId/html
\`\`\`

返回 \`html_content\` 字段包含完整 HTML 内容。

#### 更新 HTML 源文件

\`\`\`
PUT /api/articles/:id/images/:imageId/html
Content-Type: application/json

{"html": "<html>新内容</html>"}
\`\`\`

#### 删除 HTML 源文件

\`\`\`
DELETE /api/articles/:id/images/:imageId/html
\`\`\`

仅删除 HTML 文件，保留图片本身。

### 版本历史

#### 获取版本历史

\`\`\`
GET /api/articles/:id/versions
\`\`\`

按版本号倒序（最新在前）。每次修改标题或正文时自动生成新版本。

### 模板管理

模板用于存储常用的文章模板（CSS 主题、内容类型等），创建文章时可从模板复制内容。

#### 获取模板列表

\`\`\`
GET /api/templates?search=关键词&category=css_theme&limit=100&offset=0
\`\`\`

参数（均为可选）：
- \`search\`: 按标题模糊搜索
- \`category\`: 按分类筛选（如 \`css_theme\`、\`content_type\`）
- \`limit\`（默认 100）/ \`offset\`（默认 0）: 分页

#### 创建模板

\`\`\`
POST /api/templates
Content-Type: application/json

{"title": "模板标题", "content": "模板内容", "description": "描述", "tags": ["标签"], "category": "css_theme"}
\`\`\`

- \`title\`（必填），其余可选

#### 获取模板详情

\`\`\`
GET /api/templates/:id
\`\`\`

#### 更新模板

\`\`\`
PUT /api/templates/:id
Content-Type: application/json

{"title": "新标题", "content": "新内容", "tags": ["新标签"], "category": "content_type"}
\`\`\`

只传需要更新的字段。

#### 删除模板

\`\`\`
DELETE /api/templates/:id
\`\`\`

不可恢复。

## 工作流程

### 创建到发布的完整流程

1. **创建草稿** → \`POST /api/articles\`
2. **上传图片** → 通过 Web UI 上传 slide 图片（PNG）
3. **上传 HTML 源文件** → \`POST /api/articles/:id/images/:imageId/html\` body: \`{"html":"..."}\`
   - **重要：上传图片时必须同时上传 HTML 源文件和渲染后的 PNG 图片**
4. **提交渲染** → \`PUT /api/articles/:id/status\` body: \`{"status":"pending_render"}\`
5. **渲染完成，提交审核** → \`PUT /api/articles/:id/status\` body: \`{"status":"pending_review"}\`
6. **审核通过，发布** → \`POST /api/articles/:id/publish\` body: \`{"xhs_note_id":"..."}\`

### 常见操作示例

**查看待审核文章：**
\`\`\`
GET /api/articles?status=pending_review
\`\`\`

**查看所有草稿：**
\`\`\`
GET /api/articles?status=draft
\`\`\`

**退回重写：**
\`\`\`
PUT /api/articles/:id/status  body: {"status":"draft"}
\`\`\`

## 呈现规范

- 文章列表用表格展示：标题、状态、标签、更新时间
- 状态用中文显示：draft→草稿、pending_render→待渲染、pending_review→待审核、published→已发布、archived→已归档
- 文章正文为 Markdown 格式，直接展示
- 时间格式化为易读的中文格式

## 错误处理

- 401: Token 无效或缺失，检查 Authorization 请求头
- 404: 文章不存在，提示用户检查 ID
- 400: 请求参数错误（如不允许的状态流转），返回体中有具体说明
`;

export function getSkillMarkdown(mcpUrl: string): string {
  return SKILL_TEMPLATE.replaceAll("{{MCP_URL}}", mcpUrl);
}
