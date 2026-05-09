import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createService, updateService } from '../api';
import type { ServiceEntry, CreateServiceInput } from '@local-dashboard/shared';

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

export function ServiceFormModal({ initial, editTarget, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(editTarget?.name ?? initial?.name ?? '');
  const [url, setUrl] = useState(editTarget?.url ?? initial?.url ?? '');
  const [description, setDescription] = useState(editTarget?.description ?? initial?.description ?? '');
  const [tagsInput, setTagsInput] = useState((editTarget?.tags ?? initial?.tags ?? []).join(', '));
  const [icon, setIcon] = useState(editTarget?.icon ?? initial?.icon ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    mutation.mutate({ name: name.trim(), url: url.trim(), description: description.trim() || undefined, tags, icon: icon.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {editTarget ? 'Edit Service' : 'Add Service'}
        </h2>
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
      </div>
    </div>
  );
}
