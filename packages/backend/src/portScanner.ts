import type { ScannedPort, ScanOptions, ProcessInfo, DockerContainerInfo } from "@local-dashboard/shared";
import { ServiceRepository } from "./serviceRepository";
import { resolveProcesses } from "./processResolver";
import { inferService } from "./inferService";
import { probeHttp } from "./httpProbe";
import type { HttpProbeResult } from "./httpProbe";
import { resolveDockerPorts } from "./dockerResolver";

const PRIORITY_PORT_SET = new Set([
  21, 22, 25, 53, 80, 110, 143, 443, 445, 587,
  1433, 1521, 2181, 2375, 2379, 2380,
  3306, 4848, 5000, 5005, 5432, 5601, 5672, 5984,
  6379, 8080, 8161, 8443, 8888, 9000, 9090,
  9200, 9300, 15672, 27017,
]);

function splitPorts(start: number, end: number): { quick: number[]; rest: number[] } {
  const quick: number[] = [];
  const rest: number[] = [];
  for (let p = start; p <= end; p++) {
    if ((p >= 3000 && p <= 9999) || PRIORITY_PORT_SET.has(p)) {
      quick.push(p);
    } else {
      rest.push(p);
    }
  }
  return { quick, rest };
}

async function checkPort(port: number, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const done = (val: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    Bun.connect({
      hostname: "127.0.0.1",
      port,
      socket: {
        open(sock) {
          sock.end();
          done(true);
        },
        error() { done(false); },
        connectError() { done(false); },
        close() {},
        data() {},
      },
    }).catch(() => done(false));

    setTimeout(() => done(false), timeout);
  });
}

function enrichPorts(
  openPorts: number[],
  existingUrls: Set<string>,
  processMap: Map<number, ProcessInfo | null>,
  probeMap: Map<number, HttpProbeResult>,
  dockerMap: Map<number, DockerContainerInfo>
): ScannedPort[] {
  return openPorts.map((port) => {
    const url = `http://127.0.0.1:${port}`;
    let processInfo: ProcessInfo | undefined = processMap.get(port) ?? undefined;
    const probe = probeMap.get(port);
    const dockerInfo = dockerMap.get(port);

    if (dockerInfo) {
      const isProxy = !processInfo || /docker|vpnkit|com\.docker/i.test(processInfo.processName);
      if (isProxy) {
        processInfo = {
          pid: processInfo?.pid ?? 0,
          processName: dockerInfo.image.split(":")[0].split("/").pop() ?? "docker",
          args: dockerInfo.command,
          dockerInfo,
        };
      } else {
        processInfo = { ...(processInfo as ProcessInfo), dockerInfo };
      }
    }

    const suggestion = inferService(port, processInfo ?? null, probe);

    return {
      port,
      serviceType: suggestion.framework,
      url,
      status: existingUrls.has(url) ? "existing" : "new",
      processInfo,
      suggestion,
      pageTitle: probe?.title,
    };
  });
}

export async function scanPorts(
  options: ScanOptions = {},
  onProgress?: (progress: number) => void,
  onEnriching?: () => void,
  onPartialReady?: (results: ScannedPort[]) => void
): Promise<ScannedPort[]> {
  const { start = 1, end = 9999 } = options.portRange ?? {};
  const BATCH_SIZE = 100;
  const TIMEOUT_MS = 200;
  const totalPorts = end - start + 1;
  let scanned = 0;

  const { quick, rest } = splitPorts(start, end);

  async function scanBatch(ports: number[]): Promise<number[]> {
    const open: number[] = [];
    for (let i = 0; i < ports.length; i += BATCH_SIZE) {
      const batch = ports.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((p) => checkPort(p, TIMEOUT_MS)));
      results.forEach((isOpen, j) => { if (isOpen) open.push(batch[j]); });
      scanned += batch.length;
      onProgress?.(Math.round((scanned / totalPorts) * 100));
    }
    return open;
  }

  // Phase 1: Quick scan — 3000-9999 + known infra ports
  const quickOpen = await scanBatch(quick);
  onEnriching?.();

  const existingUrls = new Set(ServiceRepository.findAll().map((s) => s.url));

  const [processMap1, probeMap1, dockerMap] = await Promise.all([
    resolveProcesses(quickOpen),
    Promise.all(quickOpen.map(async (p) => [p, await probeHttp(p)] as const)).then((e) => new Map(e)),
    resolveDockerPorts().catch(() => new Map()),
  ]);

  const partialResults = enrichPorts(quickOpen, existingUrls, processMap1, probeMap1, dockerMap);
  onPartialReady?.(partialResults);

  // Phase 2: Remaining ports — 1-2999 minus known infra
  const restOpen = await scanBatch(rest);

  const [processMap2, probeMap2] = await Promise.all([
    resolveProcesses(restOpen),
    Promise.all(restOpen.map(async (p) => [p, await probeHttp(p)] as const)).then((e) => new Map(e)),
  ]);

  const restResults = enrichPorts(restOpen, existingUrls, processMap2, probeMap2, dockerMap);
  return [...partialResults, ...restResults];
}
