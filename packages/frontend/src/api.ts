import type {
  ServiceEntry,
  CreateServiceInput,
  UpdateServiceInput,
  ScanOptions,
  ScanTask,
  ProcessInfo,
  ServiceSuggestion,
} from '@local-dashboard/shared';

const BASE = '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchServices(params?: { tags?: string; source?: string }): Promise<ServiceEntry[]> {
  const qs = new URLSearchParams();
  if (params?.tags) qs.set('tags', params.tags);
  if (params?.source) qs.set('source', params.source);
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch(`/services${query}`);
}

export function fetchService(id: string): Promise<ServiceEntry> {
  return apiFetch(`/services/${id}`);
}

export function createService(input: CreateServiceInput): Promise<ServiceEntry> {
  return apiFetch('/services', { method: 'POST', body: JSON.stringify(input) });
}

export function updateService(id: string, input: UpdateServiceInput): Promise<ServiceEntry> {
  return apiFetch(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteService(id: string): Promise<void> {
  return apiFetch(`/services/${id}`, { method: 'DELETE' });
}

export function startScan(options?: ScanOptions): Promise<{ taskId: string }> {
  return apiFetch('/scan', { method: 'POST', body: JSON.stringify(options ?? {}) });
}

export function getScanStatus(taskId: string): Promise<ScanTask> {
  return apiFetch(`/scan/${taskId}`);
}

export function analyzePort(port: number, processInfo?: ProcessInfo): Promise<ServiceSuggestion> {
  return apiFetch('/scan/analyze', {
    method: 'POST',
    body: JSON.stringify({ port, processInfo }),
  });
}
