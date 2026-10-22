import { useCallback, useEffect, useRef, useState } from 'react'

export function useAudioPlayer() {
  const audioRef = useRef(null)
  const urlRef = useRef('')
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const disconnectGraph = useCallback(() => {
    try {
      sourceRef.current?.disconnect()
    } catch {
      /* already disconnected */
    }
    try {
      analyserRef.current?.disconnect()
    } catch {
      /* already disconnected */
    }
    sourceRef.current = null
    analyserRef.current = null
  }, [])

  const cleanup = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = ''
    }
    audioRef.current = null
    disconnectGraph()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setPlaying(false)
    setProgress(0)
  }, [disconnectGraph])

  const attachAnalyser = useCallback((audio) => {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx()
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()
    disconnectGraph()
    const source = ctx.createMediaElementSource(audio)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.72
    source.connect(analyser)
    analyser.connect(ctx.destination)
    sourceRef.current = source
    analyserRef.current = analyser
  }, [disconnectGraph])

  const unlock = useCallback(() => {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx()
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()
  }, [])

  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  const playBase64 = useCallback(
    async (base64, mimeType = 'audio/wav') => {
      cleanup()
      unlock()
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType.split(';')[0] || 'audio/wav' })
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      const audio = new Audio()
      audio.preload = 'auto'
      audio.src = url
      audio.volume = 1
      audioRef.current = audio
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration)
      }
      try {
        attachAnalyser(audio)
      } catch {
        /* play through the element if Web Audio is busy */
      }
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume()
      }
      setPlaying(true)
      await new Promise((resolve, reject) => {
        audio.onended = () => {
          setPlaying(false)
          setProgress(1)
          resolve()
        }
        audio.onerror = () => {
          setPlaying(false)
          reject(new Error('Audio playback failed'))
        }
        const start = () =>
          audio.play().catch(async (err) => {
            try {
              await audioCtxRef.current?.resume()
              await audio.play()
            } catch {
              reject(err)
            }
          })
        start()
      })
      return audio
    },
    [attachAnalyser, cleanup, unlock]
  )

  const loadVoices = useCallback(async () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return []
    const existing = window.speechSynthesis.getVoices()
    if (existing.length) return existing
    await new Promise((resolve) => {
      const done = () => resolve()
      window.speechSynthesis.addEventListener('voiceschanged', done, { once: true })
      setTimeout(done, 400)
    })
    return window.speechSynthesis.getVoices()
  }, [])

  const speakText = useCallback(
    async (text, lang = 'ml-IN') => {
      const spoken = String(text || '').trim()
      if (!spoken) throw new Error('Nothing to speak.')
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        throw new Error('Browser speech is not available.')
      }
      cleanup()
      const voices = await loadVoices()
      const voice = voices.find((item) => item.lang.toLowerCase().startsWith('ml'))
      if (!voice) {
        throw new Error('No Malayalam computer voice is installed.')
      }
      await new Promise((resolve, reject) => {
        const utter = new SpeechSynthesisUtterance(spoken)
        if (voice) utter.voice = voice
        utter.lang = voice?.lang || lang
        utter.rate = 0.95
        utter.onend = () => {
          setPlaying(false)
          setProgress(1)
          resolve()
        }
        utter.onerror = (event) => {
          setPlaying(false)
          reject(new Error(event.error || 'Browser speech failed.'))
        }
        setPlaying(true)
        setProgress(0)
        window.speechSynthesis.speak(utter)
      })
    },
    [cleanup, loadVoices]
  )

  useEffect(() => cleanup, [cleanup])

  return { playBase64, speakText, stop, unlock, playing, progress, analyserRef }
}
