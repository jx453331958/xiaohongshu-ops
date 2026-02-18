const SKILL_TEMPLATE = `---
name: xiaohongshu-ops
description: >
  管理小红书内容运营平台的文章。当用户提到创建文章、查看文章列表、
  修改文章状态、发布到小红书、管理图片、查看版本历史等操作时触发。
  通过 MCP Server 调用 xiaohongshu-ops API。
argument-hint: "[操作描述，如：列出所有草稿、创建一篇关于AI工具的文章]"
---

# 小红书内容运营

通过 xiaohongshu-ops MCP Server 管理小红书账号的内容创作、审核和发布流程。

## 快速配置

将以下内容添加到项目的 \`.mcp.json\`：

\`\`\`json
{
  "mcpServers": {
    "xiaohongshu-ops": {
      "type": "streamable-http",
      "url": "{{MCP_URL}}/mcp",
      "headers": {
        "Authorization": "Bearer <你的 API_AUTH_TOKEN>"
      }
    }
  }
}
\`\`\`

## 可用工具

### 文章 CRUD

#### list_articles — 获取文章列表

支持按状态、标签、分类、关键词筛选和分页。

\`\`\`
list_articles(status="draft", limit=10)
list_articles(search="AI工具", tag="教程")
\`\`\`

参数：
- \`status\`（可选）：draft / pending_render / pending_review / published / archived
- \`tag\`（可选）：按标签筛选
- \`category\`（可选）：按分类筛选
- \`search\`（可选）：按标题或内容搜索
- \`limit\`（可选，默认 20）：每页条数
- \`offset\`（可选，默认 0）：偏移量

#### create_article — 创建新文章

创建草稿状态的文章，同时自动生成 v1 版本。

\`\`\`
create_article(title="5个AI工具推荐", content="# 正文\\n...", tags=["AI", "工具"], category="AI工具")
\`\`\`

参数：
- \`title\`（必填）：文章标题
- \`content\`（可选）：Markdown 正文
- \`tags\`（可选）：标签数组
- \`category\`（可选）：分类名

#### get_article — 获取文章详情

\`\`\`
get_article(article_id="uuid")
\`\`\`

#### update_article — 更新文章

修改标题或正文会自动创建新版本。只传需要更新的字段。

\`\`\`
update_article(article_id="uuid", title="新标题", content="新正文")
\`\`\`

#### delete_article — 删除文章

不可恢复，关联的版本、图片、统计数据一并删除。

\`\`\`
delete_article(article_id="uuid")
\`\`\`

### 状态管理

#### get_article_status — 获取当前状态和允许的流转

\`\`\`
get_article_status(article_id="uuid")
\`\`\`

返回当前状态和允许的下一步状态列表。

#### update_article_status — 更新文章状态

\`\`\`
update_article_status(article_id="uuid", status="pending_render")
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

#### publish_article — 发布到小红书

记录小红书 note_id，自动将状态设为 published。

\`\`\`
publish_article(article_id="uuid", xhs_note_id="note_abc123")
publish_article(article_id="uuid", xhs_note_id="note_abc123", views=100, likes=50)
\`\`\`

参数：
- \`article_id\`（必填）：文章 UUID
- \`xhs_note_id\`（必填）：小红书笔记 ID
- \`views / likes / favorites / comments\`（可选）：初始统计数据

### 图片管理

#### list_article_images — 获取文章图片列表

\`\`\`
list_article_images(article_id="uuid")
\`\`\`

按 sort_order 升序返回。

#### delete_article_image — 删除图片

同时删除存储文件和数据库记录。

\`\`\`
delete_article_image(article_id="uuid", image_id="image-uuid")
\`\`\`

> 注意：图片上传需通过 Web UI 完成，LLM 无法提供二进制文件。

### 版本历史

#### get_article_versions — 获取版本历史

\`\`\`
get_article_versions(article_id="uuid")
\`\`\`

按版本号倒序（最新在前）。每次修改标题或正文时自动生成新版本。

## 工作流程

### 创建到发布的完整流程

1. **创建草稿** → \`create_article(title, content, tags, category)\`
2. **上传图片** → 通过 Web UI 上传 slide 图片
3. **提交渲染** → \`update_article_status(article_id, status="pending_render")\`
4. **渲染完成，提交审核** → \`update_article_status(article_id, status="pending_review")\`
5. **审核通过，发布** → \`publish_article(article_id, xhs_note_id="...")\`

### 常见操作

**查看待处理的文章：**
\`\`\`
list_articles(status="pending_review")
\`\`\`

**批量查看所有草稿：**
\`\`\`
list_articles(status="draft")
\`\`\`

**退回重写：**
\`\`\`
update_article_status(article_id, status="draft")
\`\`\`

## 呈现规范

- 文章列表用表格展示：标题、状态、标签、更新时间
- 状态用中文显示：draft→草稿、pending_render→待渲染、pending_review→待审核、published→已发布、archived→已归档
- 文章正文为 Markdown 格式，直接展示
- 时间格式化为易读的中文格式

## 错误处理

- 文章不存在时提示用户检查 ID
- 状态流转被拒绝时，说明当前状态和允许的目标状态
- API 连接失败时，提示检查 MCP Server 是否正常运行（\`/health\` 端点）
`;

export function getSkillMarkdown(mcpUrl: string): string {
  return SKILL_TEMPLATE.replaceAll("{{MCP_URL}}", mcpUrl);
}
