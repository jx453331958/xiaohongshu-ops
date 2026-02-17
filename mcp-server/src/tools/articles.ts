import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, formatResult, formatError } from "../api-client.js";

export function registerArticleTools(server: McpServer): void {
  server.tool(
    "list_articles",
    "获取文章列表，支持按状态、标签、分类、关键词筛选和分页",
    {
      status: z
        .enum([
          "draft",
          "pending_render",
          "pending_review",
          "published",
          "archived",
        ])
        .optional()
        .describe(
          "按状态筛选：draft/pending_render/pending_review/published/archived",
        ),
      tag: z.string().optional().describe("按标签筛选"),
      category: z.string().optional().describe("按分类筛选"),
      search: z.string().optional().describe("按标题或内容搜索关键词"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe("每页条数，默认 20"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("偏移量，默认 0"),
    },
    async ({ status, tag, category, search, limit, offset }) => {
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (tag) params.set("tag", tag);
        if (category) params.set("category", category);
        if (search) params.set("search", search);
        params.set("limit", String(limit));
        params.set("offset", String(offset));

        const result = await apiRequest(`/articles?${params.toString()}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "create_article",
    "创建新文章，初始状态为 draft（草稿），同时自动创建 v1 版本",
    {
      title: z.string().min(1).describe("文章标题（必填）"),
      content: z.string().optional().describe("文章正文（Markdown 格式）"),
      tags: z
        .array(z.string())
        .optional()
        .describe('标签列表，如 ["猫咪", "日常"]'),
      category: z.string().optional().describe("分类名称"),
    },
    async ({ title, content, tags, category }) => {
      try {
        const result = await apiRequest("/articles", {
          method: "POST",
          body: JSON.stringify({ title, content, tags, category }),
        });
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "get_article",
    "获取文章详情，包含标题、正文、标签、状态、小红书 note_id 等",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
    },
    async ({ article_id }) => {
      try {
        const result = await apiRequest(`/articles/${article_id}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "update_article",
    "更新文章内容（标题、正文、标签、分类），修改标题或正文会自动创建新版本",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
      title: z.string().optional().describe("新标题"),
      content: z.string().optional().describe("新正文（Markdown 格式）"),
      tags: z.array(z.string()).optional().describe("新标签列表"),
      category: z.string().optional().describe("新分类"),
    },
    async ({ article_id, title, content, tags, category }) => {
      try {
        const body: Record<string, unknown> = {};
        if (title !== undefined) body.title = title;
        if (content !== undefined) body.content = content;
        if (tags !== undefined) body.tags = tags;
        if (category !== undefined) body.category = category;

        const result = await apiRequest(`/articles/${article_id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "delete_article",
    "删除文章（不可恢复，关联的版本、图片、统计数据会一并删除）",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
    },
    async ({ article_id }) => {
      try {
        const result = await apiRequest(`/articles/${article_id}`, {
          method: "DELETE",
        });
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
