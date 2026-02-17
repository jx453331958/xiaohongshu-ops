import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, formatResult, formatError } from "../api-client.js";

export function registerImageTools(server: McpServer): void {
  server.tool(
    "list_article_images",
    "获取文章的图片列表（按排序顺序），返回每张图片的 ID、URL、排序序号",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
    },
    async ({ article_id }) => {
      try {
        const result = await apiRequest(`/articles/${article_id}/images`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "delete_article_image",
    "删除文章中的指定图片（同时删除存储文件和数据库记录）",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
      image_id: z.string().uuid().describe("图片 UUID"),
    },
    async ({ article_id, image_id }) => {
      try {
        const result = await apiRequest(
          `/articles/${article_id}/images?image_id=${image_id}`,
          { method: "DELETE" },
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
