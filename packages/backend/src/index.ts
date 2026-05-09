import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { servicesRouter } from "./servicesRouter";
import { scanRouter } from "./scanRouter";
import { startHealthChecker, stopHealthChecker } from "./healthChecker";
import { startMcpStdio, createMcpServer, createMcpHttpTransport } from "./mcpServer";

const isMcpStdio = process.argv.includes("--mcp-stdio");

if (isMcpStdio) {
  startMcpStdio().catch(console.error);
} else {
  const app = new Hono();

  app.use("*", cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
  app.use("*", logger());

  app.route("/api/services", servicesRouter);
  app.route("/api/scan", scanRouter);

  // MCP HTTP endpoint using WebStandard transport (Bun-compatible)
  const mcpServer = createMcpServer();
  const mcpTransport = createMcpHttpTransport();
  mcpServer.connect(mcpTransport);

  app.all("/mcp", async (c) => {
    const response = await mcpTransport.handleRequest(c.req.raw);
    return response;
  });

  const port = parseInt(process.env.PORT ?? "3737", 10);

  serve({ fetch: app.fetch, port }, () => {
    console.log(`Backend running on http://127.0.0.1:${port}`);
    console.log(`MCP endpoint: http://127.0.0.1:${port}/mcp`);
  });

  startHealthChecker();

  process.on("SIGINT", () => {
    stopHealthChecker();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stopHealthChecker();
    process.exit(0);
  });
}
