import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, formatResult, formatError } from "../api-client.js";

export function registerPublishTools(server: McpServer): void {
  server.tool(
    "publish_article",
    "发布文章到小红书，记录 note_id 并可选记录初始数据（浏览量、点赞、收藏、评论）。会自动将状态设为 published",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
      xhs_note_id: z.string().min(1).describe("小红书笔记 ID（必填）"),
      views: z.number().int().min(0).optional().describe("初始浏览量"),
      likes: z.number().int().min(0).optional().describe("初始点赞数"),
      favorites: z.number().int().min(0).optional().describe("初始收藏数"),
      comments: z.number().int().min(0).optional().describe("初始评论数"),
    },
    async ({ article_id, xhs_note_id, views, likes, favorites, comments }) => {
      try {
        const body: Record<string, unknown> = { xhs_note_id };
        if (views !== undefined) body.views = views;
        if (likes !== undefined) body.likes = likes;
        if (favorites !== undefined) body.favorites = favorites;
        if (comments !== undefined) body.comments = comments;

        const result = await apiRequest(`/articles/${article_id}/publish`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
