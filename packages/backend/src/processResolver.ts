import type { ProcessInfo } from "@local-dashboard/shared";

function runCmd(args: string[]): string {
  try {
    const proc = Bun.spawnSync(args, { stderr: "pipe" });
    return new TextDecoder().decode(proc.stdout).trim();
  } catch {
    return "";
  }
}

function parseLsofListenLine(output: string): { pid: number; processName: string } | null {
  for (const line of output.split("\n")) {
    if (!line.includes("(LISTEN)")) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const pid = parseInt(parts[1], 10);
    if (!isNaN(pid) && pid > 0) return { pid, processName: parts[0] };
  }
  return null;
}

function getCwd(pid: number): string | undefined {
  // lsof -p <pid> -d cwd  →  last column of the cwd row is the path
  const out = runCmd(["lsof", "-p", String(pid), "-d", "cwd"]);
  for (const line of out.split("\n")) {
    if (!line.includes(" cwd ")) continue;
    const parts = line.trim().split(/\s+/);
    const last = parts[parts.length - 1];
    if (last && last.startsWith("/")) return last;
  }
  return undefined;
}

async function getProjectName(cwd: string): Promise<string | undefined> {
  // 1. git remote origin → repo name (most human-readable)
  const gitName = getGitRepoName(cwd);
  if (gitName) return gitName;

  // 2. package.json
  try {
    const pkg = await Bun.file(`${cwd}/package.json`).json() as { name?: string };
    if (typeof pkg.name === "string" && pkg.name.length > 0) {
      return pkg.name.replace(/^@[^/]+\//, "");
    }
  } catch { /* fall through */ }

  // 3. pyproject.toml
  try {
    const text = await Bun.file(`${cwd}/pyproject.toml`).text();
    const m = text.match(/^name\s*=\s*["']([^"']+)["']/m);
    if (m) return m[1];
  } catch { /* fall through */ }

  // 4. Cargo.toml
  try {
    const text = await Bun.file(`${cwd}/Cargo.toml`).text();
    const m = text.match(/^name\s*=\s*"([^"]+)"/m);
    if (m) return m[1];
  } catch { /* fall through */ }

  // 5. go.mod
  try {
    const text = await Bun.file(`${cwd}/go.mod`).text();
    const m = text.match(/^module\s+(\S+)/m);
    if (m) return m[1].split("/").pop();
  } catch { /* fall through */ }

  // 6. directory name as fallback
  const parts = cwd.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

function getGitRepoName(cwd: string): string | undefined {
  const remote = runCmd(["git", "-C", cwd, "remote", "get-url", "origin"]);
  if (!remote) return undefined;
  // HTTPS: https://github.com/org/repo.git  or  SSH: git@github.com:org/repo.git
  const m = remote.match(/\/([^/]+?)(?:\.git)?$/) ?? remote.match(/:([^:]+?)(?:\.git)?$/);
  return m ? m[1] : undefined;
}

const ENV_KEYS_OF_INTEREST = [
  "APP_NAME", "APPLICATION_NAME", "SERVICE_NAME",
  "FLASK_APP", "DJANGO_SETTINGS_MODULE",
  "SPRING_APPLICATION_NAME",
  "VITE_APP_TITLE", "REACT_APP_NAME",
  "NODE_ENV", "APP_ENV", "RAILS_ENV",
];

function getEnvVars(pid: number): Record<string, string> {
  // ps ewww includes the environment block; format varies by OS
  const out = runCmd(["ps", "ewww", "-p", String(pid)]);
  if (!out) return {};

  const result: Record<string, string> = {};
  // env vars appear as KEY=value separated by spaces in the ps output
  for (const key of ENV_KEYS_OF_INTEREST) {
    const m = out.match(new RegExp(`(?:^|\\s)${key}=([^\\s]+)`));
    if (m) result[key] = m[1];
  }
  return result;
}

export async function getProcessForPort(port: number): Promise<ProcessInfo | null> {
  const lsofOut = runCmd(["lsof", "-i", `TCP:${port}`, "-n", "-P"]);
  if (!lsofOut) return null;

  const parsed = parseLsofListenLine(lsofOut);
  if (!parsed) return null;

  const { pid, processName } = parsed;

  // Full command line from ps
  const args = runCmd(["ps", "-p", String(pid), "-o", "args="]);

  // CWD
  const cwd = getCwd(pid);

  // Project name from manifest files in CWD
  const projectName = cwd ? await getProjectName(cwd) : undefined;

  // Env vars (best-effort)
  const envVars = getEnvVars(pid);

  return { pid, processName, args, cwd, projectName, ...(Object.keys(envVars).length > 0 ? { envVars } : {}) };
}

/** Resolve process info for multiple ports in parallel. */
export async function resolveProcesses(
  ports: number[]
): Promise<Map<number, ProcessInfo | null>> {
  const entries = await Promise.all(
    ports.map(async (port) => [port, await getProcessForPort(port)] as const)
  );
  return new Map(entries);
}
