import { ServiceRepository } from "./serviceRepository";

const INTERVAL_MS = 30_000;
const TIMEOUT_MS = 3_000;

async function checkService(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timer);
    return res.status < 600;
  } catch {
    return false;
  }
}

async function runHealthChecks(): Promise<void> {
  const services = ServiceRepository.findAll();
  await Promise.all(
    services.map(async (service) => {
      const active = await checkService(service.url);
      if (active !== service.isActive) {
        ServiceRepository.updateActiveStatus(service.id, active);
      }
    })
  );
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startHealthChecker(): void {
  runHealthChecks();
  timer = setInterval(runHealthChecks, INTERVAL_MS);
}

export function stopHealthChecker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
