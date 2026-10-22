import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { History, Mic, MicOff, Send, Settings2, Square } from 'lucide-react'
import AudioPlayer from '../components/AudioPlayer'
import ChatMessage from '../components/ChatMessage'
import SettingsPanel from '../components/SettingsPanel'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import ParticleGlobe from '../components/ParticleGlobe'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { api } from '../services/api'
import { APP_NAME, TAGLINE, WELCOME } from '../utils/constants'

const DEFAULT_PREFS = {
  preferredVoice: 'Anjali',
  preferredSpeakingStyle: 'friendly',
  audioAutoplay: true,
  responseLength: 'short',
  preferredLanguage: 'ml',
  theme: 'system',
  showChat: true,
  showHistory: true,
}

function applyTheme(theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export default function HomePage() {
  const [status, setStatus] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([{ role: 'assistant', text: WELCOME }])
  const [input, setInput] = useState('')
  const [voiceState, setVoiceState] = useState('idle')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [preferences, setPreferences] = useState(DEFAULT_PREFS)
  const abortRef = useRef(null)
  const threadRef = useRef(null)
  const inFlightRef = useRef(false)
  const submitVoiceRef = useRef(null)
  const recorder = useVoiceRecorder()
  const player = useAudioPlayer()

  const speechReady = Boolean(
    status?.python?.ok ||
      status?.python?.stt_ready ||
      status?.speech?.ok ||
      status?.speech?.stt_ready ||
      status?.speech?.tts_ready
  )
  const llmReady = Boolean(status?.llm?.ready)
  const showChat = preferences.showChat !== false
  const showHistory = preferences.showHistory !== false

  const refreshStatus = useCallback(async () => {
    try {
      const data = await api.status()
      setStatus(data)
    } catch {
      setStatus({ mongodb: false, llm: { ready: false }, speech: { ok: false }, python: { ok: false } })
    }
  }, [])

  const refreshConversations = useCallback(async () => {
    const data = await api.listConversations()
    setConversations(data.conversations || [])
  }, [])

  useEffect(() => {
    refreshStatus()
    refreshConversations()
    api
      .getPreferences()
      .then((data) => {
        const next = { ...DEFAULT_PREFS, ...data.preferences }
        setPreferences(next)
        applyTheme(next.theme)
      })
      .catch(() => applyTheme('system'))
    const timer = setInterval(refreshStatus, 30000)
    return () => clearInterval(timer)
  }, [refreshConversations, refreshStatus])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, voiceState])

  useEffect(() => {
    if (!showHistory) setSidebarOpen(false)
  }, [showHistory])

  const loadConversation = useCallback(async (id) => {
    const data = await api.getConversation(id)
    setActiveId(id)
    setMessages(data.conversation.messages || [])
    setSidebarOpen(false)
  }, [])

  const startNew = useCallback(async () => {
    player.stop()
    const data = await api.createConversation()
    setActiveId(data.conversation._id)
    setMessages(data.conversation.messages)
    setError('')
    setVoiceState('idle')
    await refreshConversations()
    setSidebarOpen(false)
  }, [player, refreshConversations])

  const deleteConversation = useCallback(
    async (id) => {
      await api.deleteConversation(id)
      if (activeId === id) {
        setActiveId(null)
        setMessages([{ role: 'assistant', text: WELCOME }])
      }
      await refreshConversations()
    },
    [activeId, refreshConversations]
  )

  const sendText = useCallback(
    async (text, { speak = false } = {}) => {
      const trimmed = (text || '').trim()
      if (!trimmed || inFlightRef.current) return
      if (!llmReady) {
        setError('Gemini is not ready. Add GEMINI_API_KEY in the project .env file.')
        setVoiceState('error')
        return
      }

      inFlightRef.current = true
      setBusy(true)
      setError('')
      setInput('')
      player.unlock?.()
      setMessages((current) => [...current, { role: 'user', text: trimmed, timestamp: new Date().toISOString() }])
      console.log('[Juu]', trimmed)
      setVoiceState('thinking')
      player.stop()

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const wantSpeech = preferences.audioAutoplay !== false
        const data = await api.chat(
          {
            conversationId: activeId,
            text: trimmed,
            speak: Boolean(speak && wantSpeech),
            voice: preferences.preferredVoice,
            speakingStyle: preferences.preferredSpeakingStyle,
            responseLength: preferences.responseLength,
          },
          controller.signal
        )
        setActiveId(data.conversationId || data.conversation?._id)
        setMessages(data.conversation.messages)
        console.log('[Juu Pennu]', data.assistantMessage)
        refreshConversations()

        if (wantSpeech) {
          setVoiceState('generating_speech')
          try {
            let audio = data.audioBase64
              ? { audioBase64: data.audioBase64, mimeType: data.audioMimeType || 'audio/wav' }
              : await api.synthesize(
                  {
                    text: data.assistantMessage,
                    voice: preferences.preferredVoice,
                    speakingStyle: data.speakingStyle || preferences.preferredSpeakingStyle,
                  },
                  controller.signal
                )
            if (!audio?.audioBase64) {
              throw new Error('Voice generation returned no audio.')
            }
            setVoiceState('speaking')
            await player.playBase64(audio.audioBase64, audio.mimeType || 'audio/wav')
            setVoiceState('idle')
          } catch (ttsErr) {
            try {
              setVoiceState('speaking')
              await player.speakText(data.assistantMessage)
              setVoiceState('idle')
            } catch {
              setVoiceState('idle')
              setError(ttsErr.message || 'Voice generation failed. Text reply is ready.')
            }
          }
        } else {
          setVoiceState('idle')
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setVoiceState('idle')
        } else {
          setVoiceState('error')
          setError(err.message)
        }
      } finally {
        inFlightRef.current = false
        setBusy(false)
        abortRef.current = null
      }
    },
    [activeId, llmReady, player, preferences, refreshConversations, speechReady]
  )

  const submitVoice = useCallback(async () => {
    if (inFlightRef.current) return
    const blob = await recorder.stop()
    if (!blob || blob.size < 1000) {
      setError('I could not hear that. Please talk a little longer.')
      setVoiceState('error')
      return
    }
    if (!speechReady) {
      setError('Speech recognition is not available. Start the Python AI service on port 8000.')
      setVoiceState('error')
      return
    }

    inFlightRef.current = true
    setBusy(true)
    setVoiceState('transcribing')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const transcript = await api.transcribe(blob, controller.signal)
      const spoken = (transcript.text || '').trim()
      console.log('[heard]', spoken)
      inFlightRef.current = false
      if (!spoken) {
        setError('I could not understand that. Please try again.')
        setVoiceState('error')
        setBusy(false)
        return
      }
      await sendText(spoken, { speak: true })
    } catch (err) {
      setVoiceState('error')
      setError(err.message)
      inFlightRef.current = false
      setBusy(false)
    }
  }, [recorder, sendText, speechReady])

  submitVoiceRef.current = submitVoice

  const handleMic = useCallback(async () => {
    if (inFlightRef.current) return
    if (recorder.recording) {
      await submitVoice()
      return
    }

    try {
      player.unlock?.()
      player.stop()
      setError('')
      setVoiceState('listening')
      await recorder.start({
        onSilence: () => submitVoiceRef.current?.(),
        onNoSpeech: async () => {
          await recorder.stop()
          setVoiceState('idle')
          setError('I did not hear speech. Tap the mic and try again.')
        },
      })
    } catch (err) {
      setVoiceState('error')
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied.'
          : err.message || 'Could not access the microphone.'
      )
    }
  }, [player, recorder, submitVoice])

  const savePreferences = useCallback(async (patch) => {
    const next = { ...preferences, ...patch }
    setPreferences(next)
    try {
      const data = await api.updatePreferences(patch)
      setPreferences({ ...DEFAULT_PREFS, ...data.preferences, ...patch })
    } catch (err) {
      setError(err.message)
    }
  }, [preferences])

  const stateHint = useMemo(() => {
    if (voiceState === 'listening') return 'Listening… speak, then pause and I will reply'
    if (voiceState === 'transcribing') return 'Hearing your words'
    if (voiceState === 'thinking') return 'Juu Pennu is thinking'
    if (voiceState === 'generating_speech') return 'Generating Malayalam voice'
    if (voiceState === 'speaking') return 'Juu Pennu is speaking'
    if (voiceState === 'error') return error || 'Something went wrong'
    return showChat ? 'Tap the mic and talk. Typing also works.' : 'Tap the mic and talk.'
  }, [error, showChat, voiceState])

  return (
    <div className="juu-shell min-h-svh text-stone-900 dark:text-emerald-50">
      <div className="float-ball float-ball-a" aria-hidden="true" />
      <div className="float-ball float-ball-b" aria-hidden="true" />
      <div className="juu-glass-veil" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-svh max-w-7xl">
        {showHistory ? (
          <Sidebar
            open={sidebarOpen}
            conversations={conversations}
            activeId={activeId}
            onSelect={loadConversation}
            onCreate={startNew}
            onDelete={deleteConversation}
            onClose={() => setSidebarOpen(false)}
          />
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col px-4 py-5 md:px-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {showHistory ? (
                <button
                  type="button"
                  className="icon-btn md:hidden"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open conversation history"
                >
                  <History size={18} />
                </button>
              ) : null}
              <div>
                <h1 className="font-display text-4xl tracking-tight text-emerald-900 dark:text-emerald-100">{APP_NAME}</h1>
                <p className="text-sm text-stone-500 dark:text-emerald-100/55">{TAGLINE}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open settings"
              >
                <Settings2 size={18} />
              </button>
            </div>
          </header>

          <section
            className={`${showChat ? 'mb-4 min-h-[22rem]' : 'mb-4 flex-1'} flex flex-col items-center justify-center px-2 text-center`}
          >
            <ParticleGlobe state={voiceState} />
            <p className="mt-3 max-w-md text-sm font-medium text-stone-600 dark:text-emerald-100/70">{stateHint}</p>
            {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
          </section>

          {showChat ? (
            <section
              ref={threadRef}
              className="glass-panel min-h-0 flex-1 space-y-3 overflow-y-auto rounded-[2.2rem] p-4"
            >
              {messages.map((message, index) => (
                <ChatMessage key={message._id || `${message.role}-${index}-${message.timestamp}`} message={message} />
              ))}
            </section>
          ) : null}

          <div className="mt-4 space-y-4">
            <AudioPlayer
              playing={player.playing || voiceState === 'speaking'}
              analyserRef={player.analyserRef}
              onStop={() => {
                player.stop()
                if (voiceState === 'speaking') setVoiceState('idle')
              }}
            />

            {showChat ? (
              <form
                className="glass-panel flex items-end gap-2 rounded-[1.8rem] p-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  sendText(input)
                }}
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      sendText(input)
                    }
                  }}
                  rows={2}
                  placeholder="മലയാളത്തിൽ എഴുതൂ…"
                  className="max-h-32 min-h-14 flex-1 resize-none bg-transparent px-3 py-2 text-base outline-none"
                  disabled={busy}
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white shadow-md shadow-emerald-900/20 disabled:opacity-40"
                  disabled={busy || !input.trim()}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
            ) : null}

            <div className="flex flex-col items-center gap-2 pb-3">
              <button
                type="button"
                onClick={handleMic}
                disabled={busy && !recorder.recording}
                className={`mic-btn flex h-20 w-20 items-center justify-center rounded-full text-white shadow-2xl transition ${
                  recorder.recording
                    ? 'bg-red-600 shadow-red-700/40'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-900/40 hover:from-emerald-400 hover:to-teal-500'
                } disabled:opacity-40`}
                aria-label="Talk to Juu Pennu"
              >
                {recorder.recording ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <p className="text-sm font-bold tracking-wide text-emerald-800 dark:text-emerald-100">Talk to Juu Pennu</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  className="rounded-full px-3 py-1 text-xs font-semibold text-stone-500 hover:bg-white/20 dark:text-emerald-100/70"
                  onClick={() => abortRef.current?.abort()}
                  disabled={!busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full px-3 py-1 text-xs font-semibold text-stone-500 hover:bg-white/20 dark:text-emerald-100/70"
                  onClick={() => {
                    player.stop()
                    setVoiceState('idle')
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    <Square size={10} /> Stop speech
                  </span>
                </button>
                {!speechReady ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                    Voice is offline — text chat still works
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>

      <SettingsPanel
        open={settingsOpen}
        preferences={preferences}
        onChange={savePreferences}
        onClose={() => setSettingsOpen(false)}
        onTheme={applyTheme}
      />
    </div>
  )
}
