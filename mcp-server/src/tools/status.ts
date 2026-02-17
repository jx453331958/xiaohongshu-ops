import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, formatResult, formatError } from "../api-client.js";

export function registerStatusTools(server: McpServer): void {
  server.tool(
    "get_article_status",
    "获取文章当前状态及允许的下一步状态转换列表。状态流：draft → pending_render → pending_review → published → archived",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
    },
    async ({ article_id }) => {
      try {
        const result = await apiRequest(`/articles/${article_id}/status`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "update_article_status",
    "更新文章状态。允许的转换：draft→pending_render/archived, pending_render→pending_review/draft/archived, pending_review→published/pending_render/archived, published→archived, archived→draft",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
      status: z
        .enum([
          "draft",
          "pending_render",
          "pending_review",
          "published",
          "archived",
        ])
        .describe("目标状态"),
    },
    async ({ article_id, status }) => {
      try {
        const result = await apiRequest(`/articles/${article_id}/status`, {
          method: "PUT",
          body: JSON.stringify({ status }),
        });
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
