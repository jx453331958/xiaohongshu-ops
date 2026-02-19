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

  // --- HTML 源文件 CRUD ---

  server.tool(
    "upload_image_html",
    "为指定图片上传 HTML 源文件（图片必须已存在且尚无 HTML）",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
      image_id: z.string().uuid().describe("图片 UUID"),
      html_content: z.string().describe("HTML 源文件内容"),
    },
    async ({ article_id, image_id, html_content }) => {
      try {
        const result = await apiRequest(
          `/articles/${article_id}/images/${image_id}/html`,
          {
            method: "POST",
            body: JSON.stringify({ html: html_content }),
          },
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "get_image_html",
    "获取指定图片的 HTML 源文件内容",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
      image_id: z.string().uuid().describe("图片 UUID"),
    },
    async ({ article_id, image_id }) => {
      try {
        const result = await apiRequest(
          `/articles/${article_id}/images/${image_id}/html`,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "update_image_html",
    "更新指定图片的 HTML 源文件内容（必须已有 HTML）",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
      image_id: z.string().uuid().describe("图片 UUID"),
      html_content: z.string().describe("新的 HTML 源文件内容"),
    },
    async ({ article_id, image_id, html_content }) => {
      try {
        const result = await apiRequest(
          `/articles/${article_id}/images/${image_id}/html`,
          {
            method: "PUT",
            body: JSON.stringify({ html: html_content }),
          },
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );

  server.tool(
    "delete_image_html",
    "删除指定图片的 HTML 源文件（保留图片本身）",
    {
      article_id: z.string().uuid().describe("文章 UUID"),
      image_id: z.string().uuid().describe("图片 UUID"),
    },
    async ({ article_id, image_id }) => {
      try {
        const result = await apiRequest(
          `/articles/${article_id}/images/${image_id}/html`,
          { method: "DELETE" },
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  );
}
