export interface HttpProbeResult {
  reachable: boolean;
  statusCode?: number;
  title?: string;
  server?: string;
  poweredBy?: string;
  bodyHints: string[];
}

const BODY_PATTERNS: Array<{ hint: string; pattern: RegExp }> = [
  { hint: "next", pattern: /__NEXT_DATA__|_next\/static/ },
  { hint: "vite", pattern: /@vite\/client|__vite_hmr|"vite"/ },
  { hint: "nuxt", pattern: /__NUXT__|_nuxt\// },
  { hint: "astro", pattern: /_astro\/|astro:scripts/ },
  { hint: "remix", pattern: /__remixContext|__remixManifest/ },
  { hint: "sveltekit", pattern: /__sveltekit_|_app\/immutable/ },
  { hint: "cra", pattern: /react-scripts|\/static\/js\/main\.chunk/ },
  { hint: "storybook", pattern: /storybook|sb-main/ },
  { hint: "wordpress", pattern: /wp-content\/|wp-includes\// },
  { hint: "grafana", pattern: /grafana|GrafanaApp/ },
  { hint: "kibana", pattern: /kibana|kbn-/ },
  { hint: "jupyter", pattern: /jupyter|JupyterLab/ },
  { hint: "pgadmin", pattern: /pgAdmin/ },
];

export async function probeHttp(port: number): Promise<HttpProbeResult> {
  const url = `http://127.0.0.1:${port}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 500);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "local-service-dashboard/1.0" },
    });
    clearTimeout(timer);

    const server = res.headers.get("server") ?? undefined;
    const poweredBy = res.headers.get("x-powered-by") ?? undefined;

    let title: string | undefined;
    const bodyHints: string[] = [];

    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) {
      // Read up to 16KB to avoid huge downloads
      const reader = res.body?.getReader();
      let body = "";
      if (reader) {
        let bytes = 0;
        while (bytes < 16384) {
          const { done, value } = await reader.read();
          if (done) break;
          body += new TextDecoder().decode(value);
          bytes += value.byteLength;
        }
        reader.cancel();
      }

      const titleMatch = body.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();

      for (const { hint, pattern } of BODY_PATTERNS) {
        if (pattern.test(body)) bodyHints.push(hint);
      }
    }

    return { reachable: true, statusCode: res.status, title, server, poweredBy, bodyHints };
  } catch {
    clearTimeout(timer);
    return { reachable: false, bodyHints: [] };
  }
}
