import { X } from 'lucide-react'
import { SPEAKING_STYLES, VOICES } from '../utils/constants'

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <label className="mb-3 flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
      <span>
        <span className="block font-bold">{label}</span>
        {hint ? <span className="block text-xs text-stone-500 dark:text-emerald-100/50">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        className="h-5 w-5 accent-emerald-600"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

export default function SettingsPanel({ open, preferences, onChange, onClose, onTheme }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-stone-950/50 backdrop-blur-sm">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-emerald-200/30 bg-emerald-50/95 p-6 shadow-2xl dark:border-emerald-950/40 dark:bg-[#0c1410]/95}">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-emerald-900 dark:text-emerald-100">Settings</h2>
            <p className="text-sm text-stone-500">Juu Pennu voice and appearance</p>
          </div>
          <button type="button" className="rounded-full p-2 hover:bg-emerald-100 dark:hover:bg-stone-800" onClick={onClose} aria-label="Close settings">
            <X />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-bold">Theme</span>
          <select
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900"
            value={preferences.theme}
            onChange={(event) => {
              onChange({ theme: event.target.value })
              onTheme(event.target.value)
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-bold">Voice</span>
          <select
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900"
            value={preferences.preferredVoice}
            onChange={(event) => onChange({ preferredVoice: event.target.value })}
          >
            {VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-bold">Default speaking style</span>
          <select
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900"
            value={preferences.preferredSpeakingStyle}
            onChange={(event) => onChange({ preferredSpeakingStyle: event.target.value })}
          >
            {SPEAKING_STYLES.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-bold">Reply length</span>
          <select
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900"
            value={preferences.responseLength}
            onChange={(event) => onChange({ responseLength: event.target.value })}
          >
            <option value="short">Short, spoken replies</option>
            <option value="medium">Medium</option>
            <option value="detailed">Detailed</option>
          </select>
        </label>

        <p className="mb-2 mt-6 text-sm font-bold">Layout</p>
        <ToggleRow
          label="Chat"
          hint="Show the message thread and text box"
          checked={preferences.showChat !== false}
          onChange={(checked) => onChange({ showChat: checked })}
        />
        <ToggleRow
          label="History"
          hint="Show saved conversations"
          checked={preferences.showHistory !== false}
          onChange={(checked) => onChange({ showHistory: checked })}
        />

        <ToggleRow
          label="Autoplay voice replies"
          checked={Boolean(preferences.audioAutoplay)}
          onChange={(checked) => onChange({ audioAutoplay: checked })}
        />
      </div>
    </div>
  )
}
