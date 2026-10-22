import { VOICE_STATES } from '../utils/constants'

const STATE_CLASS = {
  idle: 'orb-idle',
  waiting: 'orb-listen',
  listening: 'orb-listen',
  transcribing: 'orb-think',
  thinking: 'orb-think',
  generating_speech: 'orb-think',
  speaking: '',
  error: '',
}

export default function VoiceOrb({ state = 'idle' }) {
  const speaking = state === 'speaking'
  const error = state === 'error'

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative grid place-items-center">
        <div
          className={`absolute h-44 w-44 rounded-full blur-2xl ${
            error ? 'bg-red-400/30' : 'bg-orange-400/30'
          }`}
        />
        <div
          className={`relative grid h-36 w-36 place-items-center rounded-full bg-gradient-to-br from-amber-200 via-orange-400 to-rose-700 shadow-2xl shadow-orange-900/30 ${STATE_CLASS[state] || ''}`}
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-orange-50/90 text-4xl">
            {error ? '!' : '❤'}
          </div>
          {speaking ? (
            <div className="absolute bottom-6 flex h-8 items-end gap-1">
              {[0, 1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className="wave-bar w-1.5 rounded-full bg-orange-950"
                  style={{ height: 18 + (bar % 3) * 6, animationDelay: `${bar * 0.12}s` }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <p className="text-sm font-semibold tracking-wide text-orange-900/80 dark:text-orange-100/80">
        {VOICE_STATES[state]?.mal} · {VOICE_STATES[state]?.label}
      </p>
    </div>
  )
}
