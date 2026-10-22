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
      className={`fixed inset-y-0 left-0 z-30 flex w-80 flex-col border-r border-emerald-200/40 bg-emerald-50/90 p-5 backdrop-blur-2xl transition-transform dark:border-emerald-950/40 dark:bg-[#0c1410]/90 md:static md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold text-emerald-800 dark:text-emerald-200">
            {APP_NAME}
          </p>
          <p className="text-sm text-stone-500 dark:text-emerald-100/60">{TAGLINE}</p>
        </div>
        <button
          type="button"
          className="rounded-full p-2 hover:bg-emerald-100 md:hidden dark:hover:bg-stone-800"
          onClick={onClose}
          aria-label="Close history"
        >
          <X size={18} />
        </button>
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-400 hover:to-teal-500"
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
                  ? 'border-emerald-300 bg-white dark:border-emerald-800 dark:bg-stone-900'
                  : 'border-transparent hover:bg-white/70 dark:hover:bg-stone-900/70'
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelect(item.id)}
              >
                <p className="truncate font-semibold text-stone-800 dark:text-emerald-50">{item.title}</p>
                <p className="truncate text-xs text-stone-500 dark:text-emerald-100/50">{item.preview}</p>
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
