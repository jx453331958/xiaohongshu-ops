import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, formatResult, formatError } from "../api-client.js";

export function registerVersionTools(server: McpServer): void {
  server.tool(
    "get_article_versions",
    "获取文章版本历史，按版本号倒序排列（最新版本在前）。每次修改标题或正文时会自动生成新版本",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
    },
    async ({ article_id }) => {
      try {
        const result = await apiRequest(`/articles/${article_id}/versions`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
