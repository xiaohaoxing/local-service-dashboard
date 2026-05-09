import Anthropic from "@anthropic-ai/sdk";
import type { ProcessInfo, ServiceSuggestion } from "@local-dashboard/shared";
import type { HttpProbeResult } from "./httpProbe";
import type { ProjectContext } from "./projectReader";

export interface AiEnrichedSuggestion extends ServiceSuggestion {
  businessContext: string;
  aiEnriched: true;
}

function buildPrompt(
  port: number,
  processInfo: ProcessInfo | null,
  probe: HttpProbeResult | undefined,
  baseSuggestion: ServiceSuggestion,
  ctx: ProjectContext
): string {
  const lines: string[] = [
    `Analyze this local development service and identify what business function it serves.`,
    ``,
    `## Port: ${port}`,
  ];

  if (processInfo) {
    lines.push(`## Process`);
    lines.push(`- Name: ${processInfo.processName}`);
    lines.push(`- Command: ${processInfo.args}`);
    lines.push(`- Working directory: ${ctx.cwd}`);
    if (processInfo.envVars && Object.keys(processInfo.envVars).length > 0) {
      lines.push(`- Env vars: ${JSON.stringify(processInfo.envVars)}`);
    }
  }

  lines.push(`## Initial Detection`);
  lines.push(`- Framework: ${baseSuggestion.framework}`);
  if (baseSuggestion.description) lines.push(`- Description: ${baseSuggestion.description}`);

  if (probe?.reachable) {
    lines.push(`## HTTP Response`);
    if (probe.title) lines.push(`- Page title: "${probe.title}"`);
    if (probe.server) lines.push(`- Server header: ${probe.server}`);
    if (probe.poweredBy) lines.push(`- X-Powered-By: ${probe.poweredBy}`);
    if (probe.bodyHints.length) lines.push(`- Body fingerprints: ${probe.bodyHints.join(", ")}`);
  }

  lines.push(`## Project Files`);
  lines.push(`- Directory: [${ctx.dirListing.join(", ")}]`);

  if (ctx.packageJson) {
    const pkg = ctx.packageJson;
    lines.push(`- package.json name: ${pkg.name ?? "(none)"}`);
    if (pkg.description) lines.push(`- package.json description: ${pkg.description}`);
    if (pkg.scripts) {
      const relevant = Object.fromEntries(
        Object.entries(pkg.scripts).filter(([k]) => ["start", "dev", "build", "serve"].includes(k))
      );
      if (Object.keys(relevant).length) lines.push(`- scripts: ${JSON.stringify(relevant)}`);
    }
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const depKeys = Object.keys(allDeps).slice(0, 30);
    if (depKeys.length) lines.push(`- key dependencies: ${depKeys.join(", ")}`);
  }

  if (ctx.envKeys?.length) {
    lines.push(`- env var keys: ${ctx.envKeys.join(", ")}`);
  }

  if (ctx.readmeExcerpt) {
    lines.push(`## README (excerpt)`);
    lines.push(ctx.readmeExcerpt.slice(0, 1000));
  }

  if (ctx.mainFileExcerpt) {
    lines.push(`## Main source file (excerpt)`);
    lines.push("```");
    lines.push(ctx.mainFileExcerpt.slice(0, 800));
    lines.push("```");
  }

  lines.push(`
Based on all the above, respond with ONLY a JSON object (no markdown, no explanation):
{
  "name": "<concise human-readable service name, max 40 chars>",
  "description": "<one sentence describing business function, max 120 chars>",
  "businessContext": "<2-3 sentences: what problem this solves, key features visible from code/config>",
  "tags": ["<2-4 lowercase tags>"],
  "icon": "<single emoji that best represents this service>"
}`);

  return lines.join("\n");
}

export async function enrichWithAI(
  port: number,
  processInfo: ProcessInfo | null,
  probe: HttpProbeResult | undefined,
  baseSuggestion: ServiceSuggestion,
  ctx: ProjectContext
): Promise<AiEnrichedSuggestion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const baseURL = process.env.ANTHROPIC_BASE_URL;
  const client = new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
  const prompt = buildPrompt(port, processInfo, probe, baseSuggestion, ctx);

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown code fences if present
    const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(json) as {
      name: string;
      description: string;
      businessContext: string;
      tags: string[];
      icon: string;
    };

    return {
      name: parsed.name ?? baseSuggestion.name,
      description: parsed.description ?? baseSuggestion.description,
      businessContext: parsed.businessContext ?? "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : baseSuggestion.tags,
      icon: parsed.icon ?? baseSuggestion.icon,
      framework: baseSuggestion.framework,
      aiEnriched: true,
    };
  } catch {
    return null;
  }
}
