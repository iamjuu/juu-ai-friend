import { useCallback, useRef, useState } from 'react'

const MAX_MS = 60000
const SILENCE_MS = 1000
const MIN_SPEECH_MS = 400
const START_GRACE_MS = 500
const SPEECH_RMS = 0.018
const NO_SPEECH_MS = 8000
const AUDIO_BITS_PER_SECOND = 24000

function pickMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  if (typeof MediaRecorder === 'undefined') return ''
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function measureRms(analyser, buffer) {
  analyser.getByteTimeDomainData(buffer)
  let sum = 0
  for (let i = 0; i < buffer.length; i += 1) {
    const value = (buffer[i] - 128) / 128
    sum += value * value
  }
  return Math.sqrt(sum / buffer.length)
}

export function useVoiceRecorder() {
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const monitorRef = useRef(null)
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const stoppingRef = useRef(false)
  const watchTimerRef = useRef(null)
  const [permission, setPermission] = useState('unknown')
  const [recording, setRecording] = useState(false)

  const cleanupMonitor = useCallback(() => {
    if (monitorRef.current) {
      clearInterval(monitorRef.current)
      monitorRef.current = null
    }
    if (watchTimerRef.current) {
      clearInterval(watchTimerRef.current)
      watchTimerRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
  }, [])

  const stop = useCallback(async () => {
    if (stoppingRef.current) return null
    stoppingRef.current = true

    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      cleanupMonitor()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setRecording(false)
      stoppingRef.current = false
      return null
    }

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm'
        resolve(new Blob(chunksRef.current, { type: mime }))
      }
      recorder.stop()
    })

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    cleanupMonitor()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    recorderRef.current = null
    chunksRef.current = []
    setRecording(false)
    stoppingRef.current = false
    return blob
  }, [cleanupMonitor])

  const start = useCallback(
    async ({ onSilence, onNoSpeech, noSpeechMs = NO_SPEECH_MS } = {}) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        const error = new Error('Microphone API is not available in this browser.')
        error.code = 'mic_unavailable'
        throw error
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
      setPermission('granted')
      streamRef.current = stream
      stoppingRef.current = false

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND } : { audioBitsPerSecond: AUDIO_BITS_PER_SECOND }
      )
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.start(250)
      recorderRef.current = recorder
      setRecording(true)

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass && typeof onSilence === 'function') {
        const audioContext = new AudioContextClass()
        audioContextRef.current = audioContext
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        const buffer = new Uint8Array(analyser.fftSize)
        const startedAt = Date.now()
        let speechStartedAt = 0
        let lastSpeechAt = 0

        monitorRef.current = setInterval(() => {
          if (stoppingRef.current || recorderRef.current?.state !== 'recording') return
          const now = Date.now()
          if (now - startedAt < START_GRACE_MS) return

          const speaking = measureRms(analyser, buffer) >= SPEECH_RMS
          if (speaking) {
            if (!speechStartedAt) speechStartedAt = now
            lastSpeechAt = now
            return
          }

          if (!speechStartedAt && now - startedAt >= noSpeechMs) {
            onNoSpeech?.()
            return
          }

          const spokenLongEnough = speechStartedAt && now - speechStartedAt >= MIN_SPEECH_MS
          if (spokenLongEnough && lastSpeechAt && now - lastSpeechAt >= SILENCE_MS) {
            onSilence()
          }
        }, 80)
      }

      timerRef.current = setTimeout(() => {
        onSilence?.()
      }, MAX_MS)
      return recorder
    },
    []
  )

  const startWatch = useCallback(async ({ onClip, intervalMs = 2000 } = {}) => {
    await start()
    if (watchTimerRef.current) clearInterval(watchTimerRef.current)
    watchTimerRef.current = setInterval(() => {
      if (stoppingRef.current || recorderRef.current?.state !== 'recording') return
      const recent = chunksRef.current.slice(-16)
      if (!recent.length) return
      const mime = recorderRef.current?.mimeType || 'audio/webm'
      onClip?.(new Blob(recent, { type: mime }))
    }, intervalMs)
  }, [start])

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setPermission('granted')
      return true
    } catch (err) {
      setPermission('denied')
      throw err
    }
  }, [])

  return { start, stop, startWatch, recording, permission, requestPermission }
}
