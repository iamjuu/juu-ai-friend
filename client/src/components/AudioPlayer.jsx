import { Pause, Play, Square } from 'lucide-react'

export default function AudioPlayer({ playing, progress, onStop, disabled }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-orange-200/70 bg-white/60 px-3 py-2 dark:border-orange-900/40 dark:bg-stone-900/50">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-100">
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-orange-100 dark:bg-stone-800">
        <div
          className="h-full rounded-full bg-orange-500 transition-all"
          style={{ width: `${Math.round((progress || 0) * 100)}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onStop}
        disabled={disabled || !playing}
        className="rounded-full p-2 text-stone-600 hover:bg-orange-100 disabled:opacity-40 dark:text-orange-100 dark:hover:bg-stone-800"
        aria-label="Stop speech"
      >
        <Square size={14} />
      </button>
    </div>
  )
}
