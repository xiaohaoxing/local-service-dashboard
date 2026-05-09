import type { DockerContainerInfo } from "@local-dashboard/shared";

function runCmd(args: string[]): string {
  try {
    const proc = Bun.spawnSync(args, { stderr: "pipe" });
    return new TextDecoder().decode(proc.stdout).trim();
  } catch {
    return "";
  }
}

function parseHostPorts(portsStr: string): number[] {
  // "0.0.0.0:8080->80/tcp, :::8080->80/tcp" → [8080]
  const result: number[] = [];
  for (const m of portsStr.matchAll(/(?:\d+\.\d+\.\d+\.\d+|:+):(\d+)->/g)) {
    const p = parseInt(m[1], 10);
    if (!isNaN(p) && !result.includes(p)) result.push(p);
  }
  return result;
}

interface PsRow {
  ID: string;
  Image: string;
  Command: string;
  Ports: string;
  Names: string;
}

async function inspectConfig(id: string): Promise<{
  envVars: Record<string, string>;
  labels: Record<string, string>;
} | null> {
  const out = runCmd(["docker", "inspect", "--format", "{{json .Config}}", id]);
  if (!out) return null;
  try {
    const cfg = JSON.parse(out) as { Env?: string[]; Labels?: Record<string, string> };
    const envVars: Record<string, string> = {};
    for (const e of cfg.Env ?? []) {
      const idx = e.indexOf("=");
      if (idx > 0) envVars[e.slice(0, idx)] = e.slice(idx + 1);
    }
    return { envVars, labels: cfg.Labels ?? {} };
  } catch {
    return null;
  }
}

export async function resolveDockerPorts(): Promise<Map<number, DockerContainerInfo>> {
  const psOut = runCmd(["docker", "ps", "--format", "{{json .}}"]);
  if (!psOut) return new Map();

  const rows: PsRow[] = psOut
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => { try { return [JSON.parse(line) as PsRow]; } catch { return []; } });

  // Map host port → row
  const portToRow = new Map<number, PsRow>();
  for (const row of rows) {
    for (const port of parseHostPorts(row.Ports)) {
      portToRow.set(port, row);
    }
  }
  if (portToRow.size === 0) return new Map();

  // Inspect only matched containers
  const uniqueIds = [...new Set([...portToRow.values()].map((r) => r.ID))];
  const detailMap = new Map<string, Awaited<ReturnType<typeof inspectConfig>>>();
  await Promise.all(uniqueIds.map(async (id) => detailMap.set(id, await inspectConfig(id))));

  const result = new Map<number, DockerContainerInfo>();
  for (const [port, row] of portToRow) {
    const detail = detailMap.get(row.ID);
    result.set(port, {
      containerId: row.ID,
      containerName: row.Names.replace(/^\//, ""),
      image: row.Image,
      command: row.Command.replace(/^"|"$/g, ""),
      envVars: detail?.envVars,
      labels: detail?.labels,
    });
  }
  return result;
}
