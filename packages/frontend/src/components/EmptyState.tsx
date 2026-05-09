export function EmptyState({ onAdd, onScan }: { onAdd: () => void; onScan: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-4">🔌</div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        No services registered yet
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        Add services manually or scan your local ports to discover what's running.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Add Service
        </button>
        <button
          onClick={onScan}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Scan Ports
        </button>
      </div>
    </div>
  );
}
