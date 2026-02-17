#!/usr/bin/env node

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { registerArticleTools } from "./tools/articles.js";
import { registerStatusTools } from "./tools/status.js";
import { registerPublishTools } from "./tools/publish.js";
import { registerImageTools } from "./tools/images.js";
import { registerVersionTools } from "./tools/versions.js";
import { getSkillMarkdown } from "./skill-template.js";

const PORT = Number(process.env.MCP_PORT) || 3002;
const HOST = process.env.MCP_HOST || "0.0.0.0";
const AUTH_TOKEN = process.env.XHS_API_AUTH_TOKEN || "";

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "xiaohongshu-ops",
    version: "0.1.0",
  });

  registerArticleTools(server);
  registerStatusTools(server);
  registerPublishTools(server);
  registerImageTools(server);
  registerVersionTools(server);

  return server;
}

async function main() {
  const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    // Health check
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", name: "xiaohongshu-ops-mcp" }));
      return;
    }

    // Skill file endpoint
    if (url.pathname === "/skill") {
      const mcpUrl = process.env.MCP_EXTERNAL_URL || `http://localhost:${PORT}`;
      const markdown = getSkillMarkdown(mcpUrl);
      res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
      res.end(markdown);
      return;
    }

    // MCP endpoint
    if (url.pathname === "/mcp") {
      // Bearer token authentication
      if (AUTH_TOKEN) {
        const authHeader = req.headers["authorization"] || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (token !== AUTH_TOKEN) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
      }

      // Handle new session initialization (POST without session ID)
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (req.method === "POST" && !sessionId) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        const server = createMcpServer();

        transport.onclose = () => {
          if (transport.sessionId) {
            sessions.delete(transport.sessionId);
          }
        };

        await server.connect(transport);
        await transport.handleRequest(req, res);

        // Session ID is assigned after handleRequest processes the initialize request
        if (transport.sessionId) {
          sessions.set(transport.sessionId, { server, transport });
        }
        return;
      }

      // Handle existing session
      if (sessionId) {
        const session = sessions.get(sessionId);
        if (session) {
          await session.transport.handleRequest(req, res);
          return;
        }
        // Session not found
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found" }));
        return;
      }

      // GET/DELETE without session ID
      if (req.method === "GET" || req.method === "DELETE") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing mcp-session-id header" }));
        return;
      }
    }

    // 404 for everything else
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`xiaohongshu-ops MCP Server listening on http://${HOST}:${PORT}/mcp`);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
