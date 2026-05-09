import { readdirSync, statSync } from "fs";

export interface ProjectContext {
  cwd: string;
  dirListing: string[];
  readmeExcerpt?: string;
  packageJson?: {
    name?: string;
    description?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  envKeys?: string[];           // keys only, never values
  mainFileExcerpt?: string;
}

function existsSync(path: string): boolean {
  try { statSync(path); return true; } catch { return false; }
}

async function readTruncated(path: string, maxBytes = 2000): Promise<string | undefined> {
  try {
    const text = await Bun.file(path).text();
    return text.slice(0, maxBytes);
  } catch {
    return undefined;
  }
}

function listDir(cwd: string): string[] {
  try {
    return readdirSync(cwd).filter((f) => !f.startsWith(".") || f === ".env.example").slice(0, 40);
  } catch {
    return [];
  }
}

function extractEnvKeys(text: string): string[] {
  return [...text.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]);
}

function resolveMainFile(
  cwd: string,
  scripts?: Record<string, string>
): string | undefined {
  const candidates: string[] = [];

  const startCmd = scripts?.start ?? scripts?.dev ?? "";
  const scriptMatch = startCmd.match(
    /(?:node|bun|ts-node|tsx)\s+([^\s]+\.(ts|js|mjs|cjs))/
  );
  if (scriptMatch) candidates.push(scriptMatch[1]);

  candidates.push(
    "src/index.ts", "src/main.ts", "src/app.ts", "src/server.ts",
    "index.ts", "main.ts", "app.ts", "server.ts",
    "src/index.js", "index.js"
  );

  for (const rel of candidates) {
    const full = `${cwd}/${rel}`;
    if (existsSync(full)) return full;
  }
  return undefined;
}

export async function readProjectContext(cwd: string): Promise<ProjectContext> {
  const dirListing = listDir(cwd);

  const readmeFile = ["README.md", "readme.md", "Readme.md"]
    .map((f) => `${cwd}/${f}`)
    .find(existsSync);
  const readmeExcerpt = readmeFile ? await readTruncated(readmeFile, 1500) : undefined;

  let packageJson: ProjectContext["packageJson"];
  try {
    const raw = await Bun.file(`${cwd}/package.json`).json() as Record<string, unknown>;
    packageJson = {
      name: raw.name as string | undefined,
      description: raw.description as string | undefined,
      scripts: raw.scripts as Record<string, string> | undefined,
      dependencies: raw.dependencies as Record<string, string> | undefined,
      devDependencies: raw.devDependencies as Record<string, string> | undefined,
    };
  } catch { /* none */ }

  const envFile = [".env.example", ".env.local.example", ".env.sample", ".env"]
    .map((f) => `${cwd}/${f}`)
    .find(existsSync);
  let envKeys: string[] | undefined;
  if (envFile) {
    const envText = await readTruncated(envFile, 2000);
    if (envText) envKeys = extractEnvKeys(envText);
  }

  const mainFile = resolveMainFile(cwd, packageJson?.scripts);
  const mainFileExcerpt = mainFile ? await readTruncated(mainFile, 1200) : undefined;

  return { cwd, dirListing, readmeExcerpt, packageJson, envKeys, mainFileExcerpt };
}
