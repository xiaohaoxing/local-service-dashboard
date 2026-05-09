import { Hono } from "hono";
import { randomUUID } from "crypto";
import { scanPorts } from "./portScanner";
import { probeHttp } from "./httpProbe";
import { readProjectContext } from "./projectReader";
import { enrichWithAI } from "./aiEnricher";
import { inferService } from "./inferService";
import { resolveDockerPorts } from "./dockerResolver";
import type { ScanTask, ScanOptions, ProcessInfo } from "@local-dashboard/shared";

const tasks = new Map<string, ScanTask>();

export const scanRouter = new Hono();

scanRouter.post("/", async (c) => {
  const body = await c.req.json<ScanOptions>().catch(() => ({} as ScanOptions));
  const portRange = body.portRange ?? { start: 1, end: 9999 };

  const task: ScanTask = {
    id: randomUUID(),
    status: "pending",
    progress: 0,
    portRange,
    results: [],
    startedAt: new Date().toISOString(),
  };

  tasks.set(task.id, task);

  // Run async, don't await
  (async () => {
    task.status = "running";
    task.results = await scanPorts(
      { portRange },
      (progress) => { task.progress = progress; },
      () => { task.status = "enriching"; },
      (partialResults) => {
        task.status = "partial";
        task.results = partialResults;
      }
    );
    task.status = "done";
    task.progress = 100;
    task.completedAt = new Date().toISOString();
  })();

  return c.json({ taskId: task.id }, 202);
});

scanRouter.get("/:taskId", (c) => {
  const task = tasks.get(c.req.param("taskId"));
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json(task);
});

// POST /api/scan/analyze — AI-powered deep analysis for a single port
scanRouter.post("/analyze", async (c) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 503);
  }

  const body = await c.req.json<{
    port: number;
    processInfo?: ProcessInfo;
    pageTitle?: string;
    bodyHints?: string[];
    server?: string;
    poweredBy?: string;
  }>().catch(() => null);

  if (!body || typeof body.port !== "number") {
    return c.json({ error: "port is required" }, 400);
  }

  const { port, processInfo } = body;

  // Re-probe HTTP and Docker in parallel
  const [probe, dockerMap] = await Promise.all([
    probeHttp(port),
    resolveDockerPorts().catch(() => new Map()),
  ]);

  // Merge Docker info if found
  let enrichedProcessInfo: ProcessInfo | null = processInfo ?? null;
  const dockerInfo = dockerMap.get(port);
  if (dockerInfo) {
    if (!enrichedProcessInfo || /docker|vpnkit/i.test(enrichedProcessInfo.processName)) {
      enrichedProcessInfo = {
        pid: enrichedProcessInfo?.pid ?? 0,
        processName: dockerInfo.image.split(":")[0].split("/").pop() ?? "docker",
        args: dockerInfo.command,
        dockerInfo,
      };
    } else {
      enrichedProcessInfo = { ...enrichedProcessInfo, dockerInfo };
    }
  }

  // Build base suggestion from existing rules
  const baseSuggestion = inferService(port, enrichedProcessInfo, probe);

  // Read deep project context if CWD is available
  const cwd = enrichedProcessInfo?.cwd;
  const ctx = cwd ? await readProjectContext(cwd) : { cwd: "", dirListing: [] };

  // Call AI
  const aiSuggestion = await enrichWithAI(port, enrichedProcessInfo, probe, baseSuggestion, ctx);

  if (!aiSuggestion) {
    return c.json({ error: "AI enrichment failed or not available" }, 500);
  }

  return c.json(aiSuggestion);
});
