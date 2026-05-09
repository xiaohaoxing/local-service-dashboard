import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { ServiceRepository } from "./serviceRepository";
import { scanPorts } from "./portScanner";

export function createMcpServer() {
  const server = new McpServer({
    name: "local-service-dashboard",
    version: "1.0.0",
  });

  // list_services tool
  server.registerTool(
    "list_services",
    {
      description: "List all locally registered services. Optionally filter by tags.",
      inputSchema: {
        tags: z.array(z.string()).optional().describe("Filter by tags"),
      },
    },
    async ({ tags }) => {
      const services = ServiceRepository.findAll(
        tags ? { tags: tags.join(",") } : undefined
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(services, null, 2) }],
      };
    }
  );

  // add_service tool
  server.registerTool(
    "add_service",
    {
      description: "Add a new service to the local service registry.",
      inputSchema: {
        name: z.string().describe("Display name for the service"),
        url: z.string().url().describe("Access URL including protocol and port"),
        description: z.string().optional().describe("Optional description"),
        tags: z.array(z.string()).optional().describe("Optional tags"),
        icon: z.string().optional().describe("Optional emoji or icon URL"),
      },
    },
    async (input) => {
      const service = ServiceRepository.create({ ...input, source: "manual" });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(service, null, 2) }],
      };
    }
  );

  // remove_service tool
  server.registerTool(
    "remove_service",
    {
      description: "Remove a service from the local service registry by ID.",
      inputSchema: {
        id: z.string().describe("Service ID to remove"),
      },
    },
    async ({ id }) => {
      const existing = ServiceRepository.findById(id);
      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Service with id "${id}" not found` }],
        };
      }
      ServiceRepository.delete(id);
      return {
        content: [{ type: "text" as const, text: `Service "${existing.name}" removed successfully` }],
      };
    }
  );

  // scan_ports tool
  server.registerTool(
    "scan_ports",
    {
      description: "Scan local ports to discover running services.",
      inputSchema: {
        portRangeStart: z.number().int().min(1).max(65535).optional().describe("Start port (default: 1)"),
        portRangeEnd: z.number().int().min(1).max(65535).optional().describe("End port (default: 9999)"),
      },
    },
    async ({ portRangeStart, portRangeEnd }) => {
      const portRange =
        portRangeStart !== undefined || portRangeEnd !== undefined
          ? { start: portRangeStart ?? 1, end: portRangeEnd ?? 9999 }
          : undefined;

      const results = await Promise.race([
        scanPorts({ portRange }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Scan timeout after 30s")), 30_000)
        ),
      ]);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  // services://registry resource
  server.registerResource(
    "services-registry",
    "services://registry",
    {
      description: "Current local service registry snapshot",
      mimeType: "application/json",
    },
    async () => {
      const services = ServiceRepository.findAll();
      return {
        contents: [
          {
            uri: "services://registry",
            mimeType: "application/json",
            text: JSON.stringify(services, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

export async function startMcpStdio() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export function createMcpHttpTransport() {
  return new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
}
