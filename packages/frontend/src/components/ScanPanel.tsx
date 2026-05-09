import { useState, useEffect, useRef, useCallback } from 'react';
import { startScan, getScanStatus, analyzePort } from '../api';
import type { ScanTask, ScannedPort, ServiceSuggestion } from '@local-dashboard/shared';

interface Props {
  onAddScannedPort: (port: ScannedPort) => void;
  aiAvailable: boolean;
}

// ── Priority scoring ──────────────────────────────────────────────────────────

function scorePort(p: ScannedPort): number {
  const s = p.suggestion;
  const tags = s?.tags ?? [];
  let score = 0;
  if (s?.aiEnriched)              score += 100;
  if (s?.businessContext)         score += 40;
  if (p.processInfo?.dockerInfo)  score += 10;
  if (p.processInfo?.cwd)         score += 30;
  if (p.processInfo?.projectName) score += 20;
  if (p.pageTitle)                score += 10;
  if (tags.includes('dev'))       score += 50;
  if (tags.includes('fullstack')) score += 45;
  if (tags.includes('frontend'))  score += 40;
  if (tags.includes('backend'))   score += 30;
  if (tags.includes('api'))       score += 25;
  if (tags.includes('database'))  score -= 15;
  if (tags.includes('cache'))     score -= 20;
  if (s?.framework === 'Unknown') score -= 30;
  if (s?.description)             score += 10;
  return score;
}

function categoryFor(p: ScannedPort): { label: string; color: string } {
  const tags = p.suggestion?.tags ?? [];
  if (tags.includes('dev') && tags.includes('fullstack'))
    return { label: 'Full-stack dev', color: 'text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-900/30' };
  if (tags.includes('dev') && tags.includes('frontend'))
    return { label: 'Frontend dev', color: 'text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-900/30' };
  if (tags.includes('dev') && (tags.includes('backend') || tags.includes('api')))
    return { label: 'Backend dev', color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30' };
  if (tags.includes('database'))
    return { label: 'Database', color: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30' };
  if (tags.includes('monitoring'))
    return { label: 'Monitoring', color: 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/30' };
  if (tags.includes('backend') || tags.includes('api'))
    return { label: 'API server', color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/30' };
  if (tags.includes('docker'))
    return { label: 'Docker', color: 'text-cyan-600 bg-cyan-50 dark:text-cyan-300 dark:bg-cyan-900/30' };
  return { label: 'Service', color: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700' };
}

// ── Scan visualizer ───────────────────────────────────────────────────────────

function ScanVisualizer({ progress, status, discoveredPorts }: {
  progress: number;
  status: string;
  discoveredPorts: number[];
}) {
  const phaseLabel =
    status === 'running'   ? 'Scanning 3000–9999 + known ports…' :
    status === 'enriching' ? 'Identifying services…' :
    status === 'partial'   ? 'Scanning 1–2999…' :
                             'Scanning…';

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-950 border border-gray-800 p-5 mb-5">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at ${progress}% 50%, rgba(99,102,241,0.6) 0%, transparent 60%)`,
          transition: 'background 0.4s ease',
        }}
      />
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" style={{ animation: 'scan-pulse 1.2s ease-in-out infinite' }} />
          <span className="text-xs font-mono text-gray-300">{phaseLabel}</span>
        </div>
        <span className="text-xs font-mono text-indigo-400">{progress}%</span>
      </div>
      <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
        {status === 'enriching' ? (
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" style={{ animation: 'shimmer 1.5s linear infinite', backgroundSize: '200% 100%' }} />
        ) : (
          <div
            className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(99,102,241,0.8)' }}
          />
        )}
      </div>
      {discoveredPorts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {discoveredPorts.slice(-30).map((port, i) => (
            <span
              key={port}
              className="font-mono text-xs px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-300 border border-indigo-800/50"
              style={{ animation: 'fade-in-up 0.3s ease both', animationDelay: `${Math.min(i * 20, 400)}ms` }}
            >
              :{port}
            </span>
          ))}
        </div>
      )}
      {status === 'enriching' && (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ animation: `bounce-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <span className="text-xs text-gray-400">Resolving processes, Docker containers, probing HTTP…</span>
        </div>
      )}
      <style>{`
        @keyframes scan-pulse { 0%,100%{opacity:1;box-shadow:0 0 4px rgba(99,102,241,.8)} 50%{opacity:.5;box-shadow:none} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fade-in-up { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce-dot { 0%,80%,100%{transform:scale(1);opacity:.6} 40%{transform:scale(1.4);opacity:1} }
        @keyframes slide-in-card { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ── Service card ──────────────────────────────────────────────────────────────

function ServiceCard({
  port,
  rank,
  analyzing,
  added,
  onAdd,
}: {
  port: ScannedPort;
  rank: number;
  analyzing: boolean;
  added: boolean;
  onAdd: (p: ScannedPort) => void;
}) {
  const s = port.suggestion;
  const proc = port.processInfo;
  const docker = proc?.dockerInfo;
  const cat = categoryFor(port);

  // Determine if this service is HTTP-reachable (safe to open in browser)
  const isWebReachable = s?.framework !== 'Unknown' &&
    !['database', 'cache', 'queue', 'infra'].every(t => (s?.tags ?? []).includes(t));

  return (
    <div
      className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300 ${
        analyzing
          ? 'border-violet-300 dark:border-violet-700 bg-gradient-to-br from-white to-violet-50/80 dark:from-gray-800 dark:to-violet-950/40 shadow-md'
          : s?.aiEnriched
          ? 'border-violet-200 dark:border-violet-800 bg-gradient-to-br from-white to-violet-50 dark:from-gray-800 dark:to-violet-950/30 shadow-sm'
          : rank === 0
          ? 'border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-800 dark:to-indigo-950/20 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
      style={{ animation: 'slide-in-card 0.4s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${rank * 60}ms` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-3xl leading-none mt-0.5 flex-shrink-0">{s?.icon ?? '🔌'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                {s?.name ?? `Service :${port.port}`}
              </span>
              {s?.aiEnriched && (
                <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-full font-medium leading-none">
                  ✨ AI
                </span>
              )}
              {analyzing && (
                <span className="flex items-center gap-1 text-xs text-violet-500">
                  <span className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  Analyzing…
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs text-indigo-500 dark:text-indigo-400">:{port.port}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
              {docker && (
                <span className="text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 py-0.5 rounded-full">
                  🐳 {docker.image.split('/').pop()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {isWebReachable && (
            <a
              href={port.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open ${port.url}`}
              className="w-7 h-7 flex items-center justify-center border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors text-sm"
            >
              ↗
            </a>
          )}
          <button
            onClick={() => !added && onAdd({ ...port, suggestion: s })}
            disabled={added}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              added
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
            }`}
          >
            {added ? '✓ Added' : 'Add'}
          </button>
        </div>
      </div>

      {/* Description / AI context */}
      {s?.businessContext ? (
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-white/60 dark:bg-gray-900/30 rounded-lg px-3 py-2">
          {s.businessContext}
        </p>
      ) : s?.description ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
      ) : port.pageTitle ? (
        <p className="text-xs text-gray-400 italic">{port.pageTitle}</p>
      ) : null}

      {/* Docker details */}
      {docker && (
        <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-3 py-1.5 font-mono flex flex-wrap gap-x-4 gap-y-0.5">
          <span title="Container name">📦 {docker.containerName}</span>
          <span title="Image">🐳 {docker.image}</span>
          {docker.command && <span className="truncate max-w-48" title={docker.command}>$ {docker.command}</span>}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {(s?.tags ?? []).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {tag}
            </span>
          ))}
        </div>
        {proc?.cwd && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate max-w-36 flex-shrink-0" title={proc.cwd}>
            {shortenPath(proc.cwd)}
          </span>
        )}
      </div>
    </div>
  );
}

function shortenPath(p: string): string {
  const parts = p.split('/').filter(Boolean);
  if (parts.length <= 3) return `/${parts.join('/')}`;
  return `…/${parts.slice(-2).join('/')}`;
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function ScanPanel({ onAddScannedPort, aiAvailable }: Props) {
  const [task, setTask] = useState<ScanTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestionOverrides, setSuggestionOverrides] = useState<Map<number, ServiceSuggestion>>(new Map());
  const [liveDiscovered, setLiveDiscovered] = useState<number[]>([]);

  // Auto-AI analysis state
  const [aiQueue, setAiQueue] = useState<number[]>([]);
  const [aiCurrent, setAiCurrent] = useState<number | null>(null);
  const [aiDone, setAiDone] = useState(0);

  // Stable display order — locked port positions, new ports appended on discovery
  const [stableOrder, setStableOrder] = useState<number[]>([]);
  const orderedPortsRef = useRef<Set<number>>(new Set());

  // Added ports tracking (ports added to service list during this session)
  const [addedPorts, setAddedPorts] = useState<Set<number>>(new Set());

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevResultsLen = useRef(0);
  // snapshot of scan results at done-time for AI queue processing
  const scanResultsRef = useRef<ScannedPort[]>([]);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  useEffect(() => () => stopPolling(), []);

  const handleSuggestionUpdate = useCallback((port: number, suggestion: ServiceSuggestion) => {
    setSuggestionOverrides((prev) => new Map(prev).set(port, suggestion));
  }, []);

  // When new ports are discovered, sort them and append to stable order
  const resultsLength = task?.results?.length ?? 0;
  useEffect(() => {
    const results = task?.results;
    if (!results) return;
    const unseen = results.filter((r) => r.status === 'new' && !orderedPortsRef.current.has(r.port));
    if (unseen.length === 0) return;
    const sorted = [...unseen].sort((a, b) => scorePort(b) - scorePort(a));
    sorted.forEach((r) => orderedPortsRef.current.add(r.port));
    setStableOrder((prev) => [...prev, ...sorted.map((r) => r.port)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsLength]);

  function handleAdd(port: ScannedPort) {
    setAddedPorts((prev) => new Set(prev).add(port.port));
    onAddScannedPort(port);
  }

  // Kick off auto-AI queue when scan completes
  useEffect(() => {
    if (task?.status !== 'done' || !aiAvailable) return;
    const ordered = [...task.results]
      .filter((r) => r.status === 'new')
      .sort((a, b) => scorePort(b) - scorePort(a))
      .map((r) => r.port);
    scanResultsRef.current = task.results;
    setAiDone(0);
    setAiQueue(ordered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.status, aiAvailable]);

  // Process queue one at a time
  useEffect(() => {
    if (!aiAvailable || aiQueue.length === 0 || aiCurrent !== null) return;
    const [next, ...rest] = aiQueue;
    setAiCurrent(next);
    setAiQueue(rest);

    const portData = scanResultsRef.current.find((r) => r.port === next);
    analyzePort(next, portData?.processInfo)
      .then((result) => handleSuggestionUpdate(next, result))
      .catch(() => {})
      .finally(() => {
        setAiCurrent(null);
        setAiDone((n) => n + 1);
      });
  }, [aiQueue, aiCurrent, aiAvailable, handleSuggestionUpdate]);

  async function handleScan() {
    setError(null);
    const portRange = { start: 1, end: 9999 };
    setTask({ id: '', status: 'pending', progress: 0, portRange, results: [], startedAt: new Date().toISOString() });
    setSuggestionOverrides(new Map());
    setLiveDiscovered([]);
    setAiQueue([]);
    setAiCurrent(null);
    setAiDone(0);
    setStableOrder([]);
    setAddedPorts(new Set());
    orderedPortsRef.current = new Set();
    prevResultsLen.current = 0;
    stopPolling();
    try {
      const { taskId } = await startScan({ portRange });
      pollRef.current = setInterval(async () => {
        try {
          const updated = await getScanStatus(taskId);
          setTask(updated);
          if (updated.results.length > prevResultsLen.current) {
            const newPorts = updated.results.slice(prevResultsLen.current).map((r) => r.port);
            setLiveDiscovered((prev) => [...prev, ...newPorts]);
            prevResultsLen.current = updated.results.length;
          }
          if (updated.status === 'done') stopPolling();
        } catch (e) {
          setError((e as Error).message);
          stopPolling();
        }
      }, 1000);
    } catch (e) {
      setTask(null);
      setError((e as Error).message);
    }
  }

  const isScanning = task?.status === 'pending' || task?.status === 'running' || task?.status === 'enriching' || task?.status === 'partial';
  const hasResults = task?.status === 'partial' || task?.status === 'done';
  const isDone = task?.status === 'done';

  function resolvePort(p: ScannedPort): ScannedPort {
    const override = suggestionOverrides.get(p.port);
    return override ? { ...p, suggestion: override } : p;
  }

  // Render in stable order (new ports appended on discovery, AI updates don't reshuffle)
  const resultsByPort = new Map((task?.results ?? []).map((r) => [r.port, r]));
  const newPorts = stableOrder
    .map((port) => resultsByPort.get(port))
    .filter((r): r is ScannedPort => r !== undefined && r.status === 'new')
    .map(resolvePort);

  const existingPorts = (task?.results ?? []).filter((r) => r.status === 'existing');
  const aiTotal = newPorts.length;
  const aiInProgress = aiCurrent !== null || aiQueue.length > 0;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Port Scanner</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Scans 1–9999 · process, Docker, HTTP &amp; AI identification
            {aiAvailable && !isScanning && !isDone && <span className="ml-1.5 text-violet-500">✨ AI ready</span>}
            {aiAvailable && isDone && aiInProgress && (
              <span className="ml-1.5 text-violet-500 animate-pulse">
                ✨ Analyzing {aiDone + 1}/{aiTotal}…
              </span>
            )}
            {aiAvailable && isDone && !aiInProgress && aiDone > 0 && (
              <span className="ml-1.5 text-violet-400">✨ {aiDone} analyzed</span>
            )}
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {isScanning ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Scanning…
            </span>
          ) : isDone ? 'Scan Again' : 'Scan Local Ports'}
        </button>
      </div>

      <div className="p-5">
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        {isScanning && (
          <ScanVisualizer
            progress={task?.progress ?? 0}
            status={task?.status ?? 'running'}
            discoveredPorts={liveDiscovered}
          />
        )}

        {hasResults && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {task?.status === 'partial' ? (
                  <>
                    <strong className="text-gray-900 dark:text-gray-100">{newPorts.length}</strong>{' '}
                    {newPorts.length === 1 ? 'service' : 'services'} found so far
                    {existingPorts.length > 0 && (
                      <span className="text-gray-400 ml-1">· {existingPorts.length} registered</span>
                    )}
                    <span className="ml-2 text-indigo-400 text-xs font-mono">· scanning 1–2999…</span>
                  </>
                ) : (
                  <>
                    <strong className="text-gray-900 dark:text-gray-100">{newPorts.length}</strong>{' '}
                    {newPorts.length === 1 ? 'service' : 'services'} discovered
                    {existingPorts.length > 0 && (
                      <span className="text-gray-400 ml-1">· {existingPorts.length} already registered</span>
                    )}
                  </>
                )}
              </p>
            </div>

            {newPorts.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-8">No new open ports found yet.</p>
            )}

            {newPorts.length > 0 && (
              <div className={`grid gap-3 ${
                newPorts.length === 1 ? 'grid-cols-1' :
                newPorts.length === 2 ? 'grid-cols-2' :
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}>
                {newPorts.map((port, i) => (
                  <ServiceCard
                    key={port.port}
                    port={port}
                    rank={i}
                    analyzing={aiCurrent === port.port}
                    added={addedPorts.has(port.port)}
                    onAdd={handleAdd}
                  />
                ))}
              </div>
            )}

            {existingPorts.length > 0 && (
              <details className="mt-5 group">
                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 select-none list-none flex items-center gap-1.5">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  {existingPorts.length} already registered
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {existingPorts.map((p) => {
                    const rp = resolvePort(p);
                    return (
                      <div key={p.port} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60">
                        <span>{rp.suggestion?.icon ?? '🔌'}</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{rp.suggestion?.name ?? `Port :${p.port}`}</span>
                        <span className="font-mono text-xs text-gray-400">:{p.port}</span>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
