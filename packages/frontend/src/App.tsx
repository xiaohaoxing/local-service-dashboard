import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchServices, deleteService } from './api';
import { ServiceCard } from './components/ServiceCard';
import { EmptyState } from './components/EmptyState';
import { ServiceFormModal } from './components/ServiceFormModal';
import { ScanPanel } from './components/ScanPanel';
import type { ServiceEntry, ScannedPort } from '@local-dashboard/shared';

export default function App() {
  const qc = useQueryClient();
  const { data: services = [], isLoading, isError } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchServices(),
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceEntry | undefined>(undefined);
  const [formInitial, setFormInitial] = useState<Partial<{ name: string; url: string; description: string; tags: string[]; icon: string }> | undefined>(undefined);
  const [showScan, setShowScan] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceEntry | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    // Check if AI analysis is available (API key configured)
    fetch('/api/scan/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"port":0}' })
      .then((r) => { if (r.status !== 503) setAiAvailable(true); })
      .catch(() => {});
  }, []);

  const allTags = [...new Set(services.flatMap((s) => s.tags))].sort();

  const filtered = services.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || s.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  function openAdd() {
    setEditTarget(undefined);
    setFormInitial(undefined);
    setShowForm(true);
  }

  function openEdit(service: ServiceEntry) {
    setEditTarget(service);
    setFormInitial(undefined);
    setShowForm(true);
  }

  function handleAddScannedPort(port: ScannedPort) {
    setEditTarget(undefined);
    const s = port.suggestion;
    setFormInitial({
      name: s?.name ?? `Service on :${port.port}`,
      url: port.url,
      description: s?.description,
      tags: s?.tags ?? [],
      icon: s?.icon,
    });
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <h1 className="text-base font-bold tracking-tight">
            🔌 Local Services
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScan((v) => !v)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {showScan ? 'Hide Scanner' : 'Scan Ports'}
            </button>
            <button
              onClick={openAdd}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              + Add Service
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
        {showScan && (
          <ScanPanel onAddScannedPort={handleAddScannedPort} aiAvailable={aiAvailable} />
        )}

        {services.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="search"
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {allTags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      activeTag === tag
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-center text-gray-400 py-16">Loading…</div>
        )}
        {isError && (
          <div className="text-center text-red-500 py-16">
            Failed to load services. Is the backend running?
          </div>
        )}
        {!isLoading && !isError && services.length === 0 && (
          <EmptyState onAdd={openAdd} onScan={() => setShowScan(true)} />
        )}
        {!isLoading && !isError && services.length > 0 && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">No services match your filter.</p>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={openEdit}
                onDelete={(s) => setDeleteConfirm(s)}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <ServiceFormModal
          initial={formInitial}
          editTarget={editTarget}
          onClose={() => setShowForm(false)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete service?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to remove <strong>{deleteConfirm.name}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(deleteConfirm!.id);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
