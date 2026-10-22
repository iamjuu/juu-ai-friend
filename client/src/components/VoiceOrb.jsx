import { VOICE_STATES } from '../utils/constants'

const STATE_CLASS = {
  idle: 'orb-idle',
  waiting: 'orb-listen',
  listening: 'orb-listen',
  transcribing: 'orb-think',
  thinking: 'orb-think',
  generating_speech: 'orb-think',
  speaking: 'orb-speak',
  error: '',
}

const SPARKS = [
  { x: 18, y: 8, delay: '0s', size: 4 },
  { x: 82, y: 16, delay: '0.6s', size: 3 },
  { x: 92, y: 52, delay: '1.1s', size: 5 },
  { x: 74, y: 86, delay: '0.3s', size: 3 },
  { x: 22, y: 88, delay: '1.4s', size: 4 },
  { x: 6, y: 46, delay: '0.9s', size: 3 },
]

export default function VoiceOrb({ state = 'idle' }) {
  const speaking = state === 'speaking'
  const error = state === 'error'
  const live = state === 'listening' || state === 'waiting' || speaking

  return (
    <div className="flex flex-col items-center gap-5">
      <div className={`orb-stage ${live ? 'is-live' : ''} ${error ? 'is-error' : ''}`}>
        <span className="orb-radar" />
        <span className="orb-radar delay-2" />
        <span className="orb-radar delay-4" />
        <div className="orb-ring dashed h-[13.5rem] w-[13.5rem]" />
        <div className="orb-ring reverse h-60 w-60 opacity-50" />
        <div className="orbit orbit-a">
          <span className="orbit-dot" />
        </div>
        <div className="orbit orbit-b">
          <span className="orbit-dot small" />
        </div>
        <div className="orbit orbit-c">
          <span className="orbit-dot" />
        </div>
        {SPARKS.map((spark) => (
          <span
            key={`${spark.x}-${spark.y}`}
            className="orb-spark"
            style={{
              left: `${spark.x}%`,
              top: `${spark.y}%`,
              width: spark.size,
              height: spark.size,
              animationDelay: spark.delay,
            }}
          />
        ))}
        <div className={`orb-glow ${error ? 'bg-red-500/25' : 'bg-emerald-400/40'}`} />
        <div
          className={`relative grid h-40 w-40 place-items-center rounded-full bg-gradient-to-br from-emerald-100 via-emerald-400 to-teal-700 shadow-[0_20px_50px_rgba(4,120,87,0.35)] ${STATE_CLASS[state] || ''}`}
        >
          <div className="orb-core grid h-24 w-24 place-items-center rounded-full bg-gradient-to-b from-emerald-50 to-green-100 text-4xl shadow-inner">
            {error ? '!' : '❤'}
          </div>
          {speaking ? (
            <div className="absolute bottom-7 flex h-8 items-end gap-1">
              {[0, 1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className="wave-bar w-1.5 rounded-full bg-emerald-950/80"
                  style={{ height: 18 + (bar % 3) * 6, animationDelay: `${bar * 0.12}s` }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <p className="text-sm font-semibold tracking-[0.18em] text-emerald-900/70 uppercase dark:text-emerald-100/70">
        {VOICE_STATES[state]?.mal} · {VOICE_STATES[state]?.label}
      </p>
    </div>
  )
}
