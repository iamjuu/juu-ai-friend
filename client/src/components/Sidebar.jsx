import { MessageSquarePlus, Trash2, X } from 'lucide-react'
import { APP_NAME, TAGLINE } from '../utils/constants'

export default function Sidebar({
  open,
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onClose,
}) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-80 flex-col border-r border-orange-200/60 bg-orange-50/95 p-4 backdrop-blur-xl transition-transform dark:border-orange-950/50 dark:bg-stone-950/95 md:static md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold text-orange-800 dark:text-orange-200">
            {APP_NAME}
          </p>
          <p className="text-sm text-stone-500 dark:text-orange-100/60">{TAGLINE}</p>
        </div>
        <button
          type="button"
          className="rounded-full p-2 hover:bg-orange-100 md:hidden dark:hover:bg-stone-800"
          onClick={onClose}
          aria-label="Close history"
        >
          <X size={18} />
        </button>
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-lg shadow-orange-700/20 hover:bg-orange-500"
      >
        <MessageSquarePlus size={18} />
        New conversation
      </button>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {conversations.length === 0 ? (
          <p className="px-2 text-sm text-stone-500">No saved conversations yet.</p>
        ) : (
          conversations.map((item) => (
            <div
              key={item.id}
              className={`group flex items-start gap-2 rounded-2xl border p-3 ${
                activeId === item.id
                  ? 'border-orange-300 bg-white dark:border-orange-800 dark:bg-stone-900'
                  : 'border-transparent hover:bg-white/70 dark:hover:bg-stone-900/70'
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelect(item.id)}
              >
                <p className="truncate font-semibold text-stone-800 dark:text-orange-50">{item.title}</p>
                <p className="truncate text-xs text-stone-500 dark:text-orange-100/50">{item.preview}</p>
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-stone-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                onClick={() => onDelete(item.id)}
                aria-label="Delete conversation"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
