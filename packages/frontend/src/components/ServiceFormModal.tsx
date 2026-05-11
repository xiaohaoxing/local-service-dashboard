import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createService, updateService, analyzePort } from '../api';
import type { ServiceEntry, CreateServiceInput, ServiceSuggestion } from '@local-dashboard/shared';

interface Props {
  initial?: Partial<CreateServiceInput>;
  editTarget?: ServiceEntry;
  onClose: () => void;
}

function isValidUrl(val: string) {
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
}

type Tab = 'manual' | 'scan';
type ScanState = 'idle' | 'scanning' | 'done' | 'error';

export function ServiceFormModal({ initial, editTarget, onClose }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('manual');
  const [name, setName] = useState(editTarget?.name ?? initial?.name ?? '');
  const [url, setUrl] = useState(editTarget?.url ?? initial?.url ?? '');
  const [description, setDescription] = useState(editTarget?.description ?? initial?.description ?? '');
  const [tagsInput, setTagsInput] = useState((editTarget?.tags ?? initial?.tags ?? []).join(', '));
  const [icon, setIcon] = useState(editTarget?.icon ?? initial?.icon ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [scanPortInput, setScanPortInput] = useState('');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState<ServiceSuggestion | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: (input: CreateServiceInput) =>
      editTarget ? updateService(editTarget.id, input) : createService(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      onClose();
    },
  });

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!url.trim()) errs.url = 'URL is required';
    else if (!isValidUrl(url.trim())) errs.url = 'Must be a valid URL (e.g. http://localhost:3000)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    mutation.mutate({
      name: name.trim(),
      url: url.trim(),
      description: description.trim() || undefined,
      tags,
      icon: icon.trim() || undefined,
    });
  }

  async function handleAnalyze() {
    const port = parseInt(scanPortInput, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      setScanError('请输入有效端口（1–65535）');
      return;
    }
    setScanState('scanning');
    setScanError(null);
    setScanResult(null);
    try {
      const result = await analyzePort(port);
      setScanResult(result);
      setScanState('done');
    } catch (e) {
      setScanError((e as Error).message);
      setScanState('error');
    }
  }

  function applyResult() {
    if (!scanResult) return;
    const port = parseInt(scanPortInput, 10);
    setName(scanResult.name);
    setUrl(`http://localhost:${port}`);
    if (scanResult.description) setDescription(scanResult.description);
    if (scanResult.tags?.length) setTagsInput(scanResult.tags.join(', '));
    if (scanResult.icon) setIcon(scanResult.icon);
    setTab('manual');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {editTarget ? 'Edit Service' : 'Add Service'}
        </h2>

        {!editTarget && (
          <div className="flex gap-1 mb-5 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('manual')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                tab === 'manual'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setTab('scan')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                tab === 'scan'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              ✨ Scan Port
            </button>
          </div>
        )}

        {!editTarget && tab === 'scan' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              输入本地端口，自动识别服务信息并通过 AI 分析，填入表单。
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={65535}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={scanPortInput}
                  onChange={(e) => setScanPortInput(e.target.value)}
                  placeholder="e.g. 3000"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAnalyze(); } }}
                />
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={scanState === 'scanning'}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {scanState === 'scanning' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Analyzing…
                    </>
                  ) : 'Analyze'}
                </button>
              </div>
              {scanError && (
                <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-3 py-2 flex items-start justify-between gap-2">
                  <p className="text-xs text-red-600 dark:text-red-400">{scanError}</p>
                  <button
                    type="button"
                    onClick={() => setTab('manual')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap flex-shrink-0"
                  >
                    手动填写 →
                  </button>
                </div>
              )}
            </div>

            {scanState === 'scanning' && (
              <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-violet-400"
                        style={{ animation: `bdot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-violet-700 dark:text-violet-300">
                    正在探测端口 {scanPortInput}，检测进程并 AI 分析…
                  </p>
                </div>
                <style>{`@keyframes bdot{0%,80%,100%{transform:scale(1);opacity:.5}40%{transform:scale(1.4);opacity:1}}`}</style>
              </div>
            )}

            {scanState === 'done' && scanResult && (
              <div className="rounded-xl bg-gradient-to-br from-white to-violet-50/60 dark:from-gray-800 dark:to-violet-950/30 border border-violet-200 dark:border-violet-700 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none flex-shrink-0">{scanResult.icon ?? '🔌'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{scanResult.name}</span>
                      {scanResult.aiEnriched && (
                        <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-full leading-none">
                          ✨ AI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs text-indigo-400">:{scanPortInput}</span>
                      {scanResult.framework && scanResult.framework !== 'Unknown' && (
                        <span className="text-xs text-gray-400">{scanResult.framework}</span>
                      )}
                    </div>
                  </div>
                </div>
                {(scanResult.businessContext ?? scanResult.description) && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-white/60 dark:bg-gray-900/30 rounded-lg px-3 py-2">
                    {scanResult.businessContext ?? scanResult.description}
                  </p>
                )}
                {scanResult.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {scanResult.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={applyResult}
                  className="w-full py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  使用这些信息填入表单 →
                </button>
              </div>
            )}
          </div>
        )}

        {(editTarget || tab === 'manual') && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My API Server"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL *
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:3000"
              />
              {errors.url && <p className="text-xs text-red-500 mt-1">{errors.url}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of this service"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags <span className="font-normal text-gray-400">(comma separated)</span>
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="dev, backend, api"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icon <span className="font-normal text-gray-400">(emoji)</span>
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🚀"
              />
            </div>
            {mutation.isError && (
              <p className="text-sm text-red-500">{(mutation.error as Error).message}</p>
            )}
            <div className="flex gap-3 justify-end mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {mutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
