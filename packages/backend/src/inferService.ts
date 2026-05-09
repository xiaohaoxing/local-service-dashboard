import type { ProcessInfo, ServiceSuggestion } from "@local-dashboard/shared";
import type { HttpProbeResult } from "./httpProbe";

interface Rule {
  framework: string;
  icon: string;
  tags: string[];
  description: string;
  match: (args: string, proc: string) => boolean;
}

const RULES: Rule[] = [
  // ── JavaScript / Node.js runtimes ─────────────────────────────────────────
  {
    framework: "Vite",
    icon: "⚡",
    tags: ["dev", "frontend"],
    description: "Vite dev server",
    match: (a) => /\bvite\b/.test(a) && !/storybook/.test(a),
  },
  {
    framework: "Next.js",
    icon: "▲",
    tags: ["dev", "fullstack"],
    description: "Next.js app",
    match: (a) => /[\\/]next[\\/]dist[\\/]bin|[\\/]\.next[\\/]|bunx next\b/.test(a),
  },
  {
    framework: "Nuxt",
    icon: "💚",
    tags: ["dev", "fullstack"],
    description: "Nuxt app",
    match: (a) => /\bnuxt\b/.test(a),
  },
  {
    framework: "NestJS",
    icon: "🦅",
    tags: ["dev", "backend", "api"],
    description: "NestJS API server",
    match: (a) => /[\\/]@nestjs[\\/]|[\\/]nest[\\/]/.test(a),
  },
  {
    framework: "Astro",
    icon: "🚀",
    tags: ["dev", "frontend"],
    description: "Astro dev server",
    match: (a) => /\bastro\b/.test(a),
  },
  {
    framework: "Remix",
    icon: "💿",
    tags: ["dev", "fullstack"],
    description: "Remix app",
    match: (a) => /[\\/]@remix-run[\\/]|[\\/]remix[\\/]/.test(a),
  },
  {
    framework: "SvelteKit",
    icon: "🧡",
    tags: ["dev", "fullstack"],
    description: "SvelteKit app",
    match: (a) => /svelte-kit|[\\/]@sveltejs[\\/]kit[\\/]/.test(a),
  },
  {
    framework: "Angular",
    icon: "🔴",
    tags: ["dev", "frontend"],
    description: "Angular dev server",
    match: (a) => /[\\/]@angular[\\/]cli[\\/]|angular-devkit/.test(a),
  },
  {
    framework: "Storybook",
    icon: "📖",
    tags: ["dev", "ui"],
    description: "Storybook component explorer",
    match: (a) => /\bstorybook\b/.test(a),
  },
  {
    framework: "Create React App",
    icon: "⚛️",
    tags: ["dev", "frontend"],
    description: "Create React App dev server",
    match: (a) => /react-scripts/.test(a),
  },
  {
    framework: "Webpack Dev Server",
    icon: "📦",
    tags: ["dev", "frontend"],
    description: "Webpack dev server",
    match: (a) => /webpack[-_]dev[-_]server|webpack serve/.test(a),
  },
  {
    framework: "Strapi",
    icon: "🎯",
    tags: ["dev", "cms", "backend"],
    description: "Strapi CMS",
    match: (a) => /[\\/]strapi[\\/]/.test(a),
  },
  {
    framework: "Prisma Studio",
    icon: "🔺",
    tags: ["dev", "database"],
    description: "Prisma Studio",
    match: (a) => /prisma/.test(a) && /studio/.test(a),
  },
  {
    framework: "Express",
    icon: "🟩",
    tags: ["backend", "api"],
    description: "Express.js server",
    match: (a) => /[\\/]express[\\/]|express\.js/.test(a),
  },
  {
    framework: "Fastify",
    icon: "🏎️",
    tags: ["backend", "api"],
    description: "Fastify server",
    match: (a) => /[\\/]fastify[\\/]/.test(a),
  },
  {
    framework: "Hono",
    icon: "🔥",
    tags: ["backend", "api"],
    description: "Hono server",
    match: (a) => /[\\/]hono[\\/]/.test(a),
  },
  {
    framework: "tRPC",
    icon: "🔷",
    tags: ["backend", "api"],
    description: "tRPC server",
    match: (a) => /[\\/]trpc[\\/]/.test(a),
  },
  // ── Python ────────────────────────────────────────────────────────────────
  {
    framework: "Django",
    icon: "🐍",
    tags: ["dev", "backend", "python"],
    description: "Django dev server",
    match: (a) => /manage\.py.+runserver|django/.test(a),
  },
  {
    framework: "FastAPI / uvicorn",
    icon: "🐍",
    tags: ["dev", "backend", "python"],
    description: "FastAPI / uvicorn ASGI server",
    match: (a, p) => /\buvicorn\b/.test(a) || p === "uvicorn",
  },
  {
    framework: "Flask",
    icon: "🐍",
    tags: ["dev", "backend", "python"],
    description: "Flask dev server",
    match: (a) => /\bflask\b/.test(a),
  },
  {
    framework: "Gunicorn",
    icon: "🐍",
    tags: ["backend", "python"],
    description: "Gunicorn WSGI server",
    match: (a, p) => /\bgunicorn\b/.test(a) || p === "gunicorn",
  },
  {
    framework: "Jupyter",
    icon: "📓",
    tags: ["dev", "notebook", "python"],
    description: "Jupyter Notebook / Lab",
    match: (a) => /\bjupyter\b/.test(a),
  },
  // ── Ruby ──────────────────────────────────────────────────────────────────
  {
    framework: "Ruby on Rails",
    icon: "💎",
    tags: ["dev", "fullstack", "ruby"],
    description: "Rails server",
    match: (a, p) => /rails.+server|bin\/rails/.test(a) || p === "puma",
  },
  // ── Go ────────────────────────────────────────────────────────────────────
  {
    framework: "Go",
    icon: "🐹",
    tags: ["backend", "go"],
    description: "Go application",
    match: (_, p) => /^go$|go-/.test(p),
  },
  // ── PHP ───────────────────────────────────────────────────────────────────
  {
    framework: "Laravel",
    icon: "🔴",
    tags: ["dev", "backend", "php"],
    description: "Laravel Artisan dev server",
    match: (a) => /artisan.+serve/.test(a),
  },
  {
    framework: "PHP",
    icon: "🐘",
    tags: ["dev", "php"],
    description: "PHP built-in server",
    match: (a, p) => p === "php" && /\-S\b/.test(a),
  },
  // ── Java ──────────────────────────────────────────────────────────────────
  {
    framework: "Spring Boot",
    icon: "☕",
    tags: ["backend", "java"],
    description: "Spring Boot application",
    match: (a) => /spring-boot|springboot/.test(a),
  },
  {
    framework: "Java",
    icon: "☕",
    tags: ["backend", "java"],
    description: "Java application",
    match: (_, p) => p === "java",
  },
  // ── Databases / tools ─────────────────────────────────────────────────────
  {
    framework: "PostgreSQL",
    icon: "🐘",
    tags: ["database"],
    description: "PostgreSQL",
    match: (a, p) => p === "postgres" || /\bpostgres\b/.test(a),
  },
  {
    framework: "MySQL",
    icon: "🐬",
    tags: ["database"],
    description: "MySQL",
    match: (_, p) => p === "mysqld" || p === "mysql",
  },
  {
    framework: "Redis",
    icon: "🔴",
    tags: ["database", "cache"],
    description: "Redis",
    match: (_, p) => p === "redis-server",
  },
  {
    framework: "MongoDB",
    icon: "🍃",
    tags: ["database"],
    description: "MongoDB",
    match: (_, p) => p === "mongod",
  },
  {
    framework: "Nginx",
    icon: "🌐",
    tags: ["server", "proxy"],
    description: "Nginx",
    match: (_, p) => p === "nginx",
  },
  {
    framework: "Caddy",
    icon: "🌐",
    tags: ["server", "proxy"],
    description: "Caddy web server",
    match: (_, p) => p === "caddy",
  },
];

// HTTP body hints → framework override (lower priority than process rules)
const BODY_HINT_RULES: Record<string, { framework: string; icon: string; tags: string[]; description: string }> = {
  next:       { framework: "Next.js",    icon: "▲",  tags: ["dev", "fullstack"],   description: "Next.js app" },
  vite:       { framework: "Vite",       icon: "⚡", tags: ["dev", "frontend"],    description: "Vite dev server" },
  nuxt:       { framework: "Nuxt",       icon: "💚", tags: ["dev", "fullstack"],   description: "Nuxt app" },
  astro:      { framework: "Astro",      icon: "🚀", tags: ["dev", "frontend"],    description: "Astro dev server" },
  remix:      { framework: "Remix",      icon: "💿", tags: ["dev", "fullstack"],   description: "Remix app" },
  sveltekit:  { framework: "SvelteKit",  icon: "🧡", tags: ["dev", "fullstack"],   description: "SvelteKit app" },
  cra:        { framework: "Create React App", icon: "⚛️", tags: ["dev", "frontend"], description: "Create React App" },
  storybook:  { framework: "Storybook",  icon: "📖", tags: ["dev", "ui"],          description: "Storybook component explorer" },
  wordpress:  { framework: "WordPress",  icon: "🔵", tags: ["cms", "php"],          description: "WordPress site" },
  grafana:    { framework: "Grafana",    icon: "📊", tags: ["monitoring"],          description: "Grafana dashboard" },
  kibana:     { framework: "Kibana",     icon: "📊", tags: ["monitoring"],          description: "Kibana dashboard" },
  jupyter:    { framework: "Jupyter",    icon: "📓", tags: ["dev", "notebook", "python"], description: "Jupyter Notebook / Lab" },
  pgadmin:    { framework: "pgAdmin",    icon: "🐘", tags: ["database"],            description: "pgAdmin" },
};

// Docker image name → service identity (matched against base image name, lowercase)
const DOCKER_IMAGE_RULES: Array<{
  pattern: RegExp;
  framework: string;
  icon: string;
  tags: string[];
  description: string;
}> = [
  { pattern: /^postgres/,                           framework: "PostgreSQL",  icon: "🐘", tags: ["database"],           description: "PostgreSQL database" },
  { pattern: /^mysql|^mariadb/,                     framework: "MySQL",       icon: "🐬", tags: ["database"],           description: "MySQL / MariaDB database" },
  { pattern: /^mongo/,                              framework: "MongoDB",     icon: "🍃", tags: ["database"],           description: "MongoDB" },
  { pattern: /^redis/,                              framework: "Redis",       icon: "🔴", tags: ["database", "cache"],  description: "Redis" },
  { pattern: /^elasticsearch|^opensearch/,          framework: "Elasticsearch", icon: "🔍", tags: ["database", "search"], description: "Elasticsearch" },
  { pattern: /^kibana/,                             framework: "Kibana",      icon: "📊", tags: ["monitoring"],         description: "Kibana dashboard" },
  { pattern: /^grafana\/grafana|^grafana$/,          framework: "Grafana",     icon: "📊", tags: ["monitoring"],         description: "Grafana dashboard" },
  { pattern: /^prom\/prometheus|^prometheus/,        framework: "Prometheus",  icon: "🔥", tags: ["monitoring"],         description: "Prometheus metrics" },
  { pattern: /^nginx/,                              framework: "Nginx",       icon: "🌐", tags: ["server", "proxy"],    description: "Nginx" },
  { pattern: /^traefik/,                            framework: "Traefik",     icon: "🌐", tags: ["server", "proxy"],    description: "Traefik reverse proxy" },
  { pattern: /^rabbitmq/,                           framework: "RabbitMQ",    icon: "🐰", tags: ["queue"],              description: "RabbitMQ message broker" },
  { pattern: /kafka/,                               framework: "Kafka",       icon: "⚡", tags: ["queue"],              description: "Apache Kafka" },
  { pattern: /^minio/,                              framework: "MinIO",       icon: "☁️", tags: ["storage"],            description: "MinIO object storage" },
  { pattern: /keycloak/,                            framework: "Keycloak",    icon: "🔐", tags: ["auth"],               description: "Keycloak identity provider" },
  { pattern: /^mailhog|^mailpit|^axllent\/mailpit/,  framework: "Mail Catcher", icon: "📬", tags: ["dev", "email"],     description: "Local mail catcher" },
  { pattern: /^clickhouse/,                         framework: "ClickHouse",  icon: "🟡", tags: ["database", "analytics"], description: "ClickHouse OLAP database" },
  { pattern: /^influxdb/,                           framework: "InfluxDB",    icon: "📈", tags: ["database", "monitoring"], description: "InfluxDB time-series DB" },
  { pattern: /^zookeeper/,                          framework: "ZooKeeper",   icon: "🦁", tags: ["infra"],              description: "Apache ZooKeeper" },
  { pattern: /^consul/,                             framework: "Consul",      icon: "🔗", tags: ["infra"],              description: "Consul service mesh" },
  { pattern: /^vault/,                              framework: "Vault",       icon: "🔒", tags: ["infra", "auth"],      description: "HashiCorp Vault" },
  { pattern: /^node/,                               framework: "Node.js",     icon: "📗", tags: ["backend"],            description: "Node.js application" },
  { pattern: /^python/,                             framework: "Python",      icon: "🐍", tags: ["backend", "python"],  description: "Python application" },
];

export function inferService(
  port: number,
  info: ProcessInfo | null,
  probe?: HttpProbeResult
): ServiceSuggestion {
  if (!info && !probe?.reachable) {
    return { name: `Service :${port}`, framework: "Unknown", icon: "🔌", tags: [] };
  }

  // ── 1. Docker image rules ─────────────────────────────────────────────────
  if (info?.dockerInfo) {
    const imgBase = info.dockerInfo.image.split(":")[0].toLowerCase();
    const imgMatch = DOCKER_IMAGE_RULES.find((r) => r.pattern.test(imgBase));
    const labels = info.dockerInfo.labels ?? {};
    const composeProject = labels["com.docker.compose.project"];
    const composeService = labels["com.docker.compose.service"];
    const ociTitle = labels["org.opencontainers.image.title"];
    const ociDesc = labels["org.opencontainers.image.description"];

    if (imgMatch) {
      const name = composeService
        ? `${composeProject ? `${composeProject}/` : ""}${composeService} (${imgMatch.framework})`
        : ociTitle ?? `${imgMatch.framework} :${port}`;
      return { name, description: ociDesc ?? imgMatch.description, framework: imgMatch.framework, icon: imgMatch.icon, tags: imgMatch.tags };
    }
    if (composeService || ociTitle) {
      const label = composeService ?? ociTitle!;
      return {
        name: composeProject ? `${composeProject}/${label}` : label,
        description: ociDesc ?? `Docker: ${info.dockerInfo.image}`,
        framework: imgBase, icon: "🐳", tags: ["docker"],
      };
    }
  }

  const args = info?.args.toLowerCase() ?? "";
  const proc = info?.processName.toLowerCase() ?? "";
  const envVars = info?.envVars ?? {};

  // ── 2. Process-based rules ────────────────────────────────────────────────
  const matched = info ? RULES.find((r) => r.match(args, proc)) : undefined;

  // ── 3. HTTP body hints ────────────────────────────────────────────────────
  const bodyMatch = !matched && probe?.bodyHints.length ? BODY_HINT_RULES[probe.bodyHints[0]] : undefined;

  // ── 4. HTTP header hints ──────────────────────────────────────────────────
  const headerMatch = !matched && !bodyMatch && probe?.reachable ? inferFromHeaders(probe) : undefined;

  const resolvedMatch = matched ?? bodyMatch ?? headerMatch;

  const envName = resolveEnvName(envVars);
  const projectName = envName ?? info?.projectName;
  const framework = resolvedMatch?.framework ?? (info ? capFirst(info.processName) : "Unknown");
  const icon = resolvedMatch?.icon ?? (info ? runtimeIcon(proc) : "🔌");
  const tags = resolvedMatch?.tags ?? (info ? runtimeTags(proc) : []);
  const description = resolvedMatch?.description ?? probe?.title;

  const name = projectName
    ? `${projectName} (${framework})`
    : framework !== "Unknown" ? `${framework} :${port}`
    : probe?.title ?? `Service :${port}`;

  return { name, description, framework, icon, tags };
}

function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function runtimeIcon(proc: string): string {
  if (/^(node|bun|deno)$/.test(proc)) return "📗";
  if (/python/.test(proc)) return "🐍";
  if (/ruby/.test(proc)) return "💎";
  if (/java/.test(proc)) return "☕";
  if (/php/.test(proc)) return "🐘";
  if (/go/.test(proc)) return "🐹";
  return "🔌";
}

function runtimeTags(proc: string): string[] {
  if (/^(node|bun|deno)$/.test(proc)) return ["node"];
  if (/python/.test(proc)) return ["python"];
  if (/ruby/.test(proc)) return ["ruby"];
  if (/java/.test(proc)) return ["java"];
  return [];
}

function resolveEnvName(env: Record<string, string>): string | undefined {
  return (
    env["APP_NAME"] ??
    env["APPLICATION_NAME"] ??
    env["SERVICE_NAME"] ??
    env["SPRING_APPLICATION_NAME"] ??
    env["VITE_APP_TITLE"] ??
    env["REACT_APP_NAME"] ??
    undefined
  );
}

function inferFromHeaders(probe: HttpProbeResult): typeof BODY_HINT_RULES[string] | undefined {
  const server = probe.server?.toLowerCase() ?? "";
  const powered = probe.poweredBy?.toLowerCase() ?? "";

  if (/next\.js/.test(powered)) return BODY_HINT_RULES["next"];
  if (/express/.test(powered)) return { framework: "Express", icon: "🟩", tags: ["backend", "api"], description: "Express.js server" };
  if (/fastify/.test(powered)) return { framework: "Fastify", icon: "🏎️", tags: ["backend", "api"], description: "Fastify server" };
  if (/nginx/.test(server)) return { framework: "Nginx", icon: "🌐", tags: ["server", "proxy"], description: "Nginx" };
  if (/caddy/.test(server)) return { framework: "Caddy", icon: "🌐", tags: ["server", "proxy"], description: "Caddy web server" };
  if (/uvicorn|starlette/.test(server)) return { framework: "FastAPI / uvicorn", icon: "🐍", tags: ["backend", "python"], description: "FastAPI / uvicorn" };
  if (/gunicorn/.test(server)) return { framework: "Gunicorn", icon: "🐍", tags: ["backend", "python"], description: "Gunicorn WSGI server" };
  if (/jetty|tomcat|spring/.test(server)) return { framework: "Java", icon: "☕", tags: ["backend", "java"], description: "Java application" };
  return undefined;
}
