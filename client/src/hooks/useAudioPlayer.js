import { useCallback, useEffect, useRef, useState } from 'react'

export function useAudioPlayer() {
  const audioRef = useRef(null)
  const urlRef = useRef('')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

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
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setPlaying(false)
    setProgress(0)
  }, [])

  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  const playBase64 = useCallback(
    async (base64, mimeType = 'audio/wav') => {
      cleanup()
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration)
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
        audio.play().catch(reject)
      })
      return audio
    },
    [cleanup]
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

  return { playBase64, speakText, stop, playing, progress }
}
