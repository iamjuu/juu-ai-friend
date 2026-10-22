function Dot({ ok }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`}
    />
  )
}

export default function StatusBadge({ status, compact = false }) {
  const mongo = Boolean(status?.mongodb)
  const llm = Boolean(status?.llm?.ready)
  const speech = Boolean(status?.speech?.ok || status?.python?.ok)
  const overall = mongo && llm

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur ${
        overall
          ? 'border-teal-700/20 bg-teal-50 text-teal-900 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-100'
          : 'border-amber-700/20 bg-amber-50 text-amber-950 dark:border-amber-400/20 dark:bg-amber-950/40 dark:text-amber-100'
      }`}
    >
      <Dot ok={overall} />
      <span>{overall ? 'Services ready' : 'Checking services'}</span>
      {compact ? null : (
        <span className="hidden gap-2 sm:flex">
          <span className="opacity-70">Mongo {mongo ? 'on' : 'off'}</span>
          <span className="opacity-70">Gemini {llm ? 'on' : 'off'}</span>
          <span className="opacity-70">Voice {speech ? 'on' : 'off'}</span>
        </span>
      )}
    </div>
  )
}
