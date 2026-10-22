import { useCallback, useRef, useState } from 'react'
import { parseWakeSpeech } from '../utils/wakeWord'

function SpeechRecognitionClass() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useWakeListener() {
  const recognitionRef = useRef(null)
  const activeRef = useRef(false)
  const handlersRef = useRef({})
  const firedRef = useRef(false)
  const [listening, setListening] = useState(false)

  const stop = useCallback(() => {
    activeRef.current = false
    firedRef.current = false
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null
      try {
        recognition.stop()
      } catch {
        /* already stopped */
      }
    }
    setListening(false)
  }, [])

  const start = useCallback((handlers = {}) => {
    const Recognition = SpeechRecognitionClass()
    if (!Recognition) return false

    handlersRef.current = handlers
    firedRef.current = false
    activeRef.current = true

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'
    recognition.maxAlternatives = 3

    recognition.onresult = (event) => {
      if (!activeRef.current || firedRef.current) return
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += `${event.results[i][0].transcript} `
      }
      const hit = parseWakeSpeech(text)
      if (!hit) return

      const isFinal = event.results[event.results.length - 1].isFinal
      if (!hit.command && !isFinal) return

      firedRef.current = true
      activeRef.current = false
      setListening(false)
      try {
        recognition.stop()
      } catch {
        /* ignore */
      }
      if (hit.command) handlersRef.current.onCommand?.(hit.command)
      else handlersRef.current.onWake?.()
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        handlersRef.current.onError?.('Microphone permission was denied.')
      }
    }

    recognition.onend = () => {
      if (!activeRef.current || firedRef.current) return
      try {
        recognition.start()
      } catch {
        /* ignore restart races */
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
      return true
    } catch {
      setListening(false)
      return false
    }
  }, [])

  return {
    start,
    stop,
    listening,
    supported: Boolean(SpeechRecognitionClass()),
  }
}
