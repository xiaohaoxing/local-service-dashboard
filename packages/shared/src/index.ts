export type ServiceSource = 'manual' | 'scanned';

export interface ServiceEntry {
  id: string;
  name: string;
  url: string;
  description?: string;
  tags: string[];
  icon?: string;
  source: ServiceSource;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScanStatus = 'pending' | 'running' | 'enriching' | 'partial' | 'done';
export type PortStatus = 'new' | 'existing';

export interface DockerContainerInfo {
  containerId: string;
  containerName: string;
  image: string;
  command: string;
  labels?: Record<string, string>;
  envVars?: Record<string, string>;
}

export interface ProcessInfo {
  pid: number;
  processName: string;
  args: string;
  cwd?: string;
  projectName?: string;
  envVars?: Record<string, string>;
  dockerInfo?: DockerContainerInfo;
}

export interface ServiceSuggestion {
  name: string;
  description?: string;
  tags: string[];
  icon: string;
  framework: string;
  businessContext?: string;
  aiEnriched?: boolean;
}

export interface ScannedPort {
  port: number;
  serviceType: string;
  url: string;
  status: PortStatus;
  processInfo?: ProcessInfo;
  suggestion?: ServiceSuggestion;
  pageTitle?: string;
}

export interface ScanTask {
  id: string;
  status: ScanStatus;
  progress: number;
  portRange: { start: number; end: number };
  results: ScannedPort[];
  startedAt: string;
  completedAt?: string;
}

export interface CreateServiceInput {
  name: string;
  url: string;
  description?: string;
  tags?: string[];
  icon?: string;
  source?: ServiceSource;
}

export interface UpdateServiceInput {
  name?: string;
  url?: string;
  description?: string;
  tags?: string[];
  icon?: string;
}

export interface ScanOptions {
  portRange?: { start: number; end: number };
}
