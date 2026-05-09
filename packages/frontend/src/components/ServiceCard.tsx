import type { ServiceEntry } from '@local-dashboard/shared';

interface Props {
  service: ServiceEntry;
  onEdit: (service: ServiceEntry) => void;
  onDelete: (service: ServiceEntry) => void;
}

function ServiceIcon({ service }: { service: ServiceEntry }) {
  if (service.icon) {
    return <span className="text-2xl">{service.icon}</span>;
  }
  const initials = service.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
      {initials}
    </span>
  );
}

export function ServiceCard({ service, onEdit, onDelete }: Props) {
  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <ServiceIcon service={service} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                service.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              title={service.isActive ? 'Online' : 'Offline'}
            />
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
            >
              {service.name}
            </a>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{service.url}</p>
        </div>
      </div>

      {/* Description */}
      {service.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{service.description}</p>
      )}

      {/* Tags */}
      {service.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {service.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(service)}
          className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(service)}
          className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
