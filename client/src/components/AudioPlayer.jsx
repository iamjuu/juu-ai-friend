import { useEffect, useRef } from 'react'

function triangle(x, center, half, height) {
  const d = Math.abs(x - center)
  if (d >= half) return 0
  return height * (1 - d / half)
}

function livePeaks(samples, buckets) {
  const peaks = new Float32Array(buckets)
  const windowSize = Math.max(1, Math.floor(samples.length / buckets))
  for (let i = 0; i < buckets; i += 1) {
    let min = 1
    let max = -1
    const start = i * windowSize
    for (let j = 0; j < windowSize; j += 1) {
      const value = (samples[start + j] - 128) / 128
      if (value < min) min = value
      if (value > max) max = value
    }
    const mag = Math.max(Math.abs(min), Math.abs(max))
    peaks[i] = (i % 2 === 0 ? 1 : -1) * Math.pow(mag, 0.42) * 1.35
  }
  return peaks
}

function syntheticPeaks(buckets, time) {
  const peaks = new Float32Array(buckets)
  const shift = (time * 0.22) % 1
  for (let i = 0; i < buckets; i += 1) {
    const x = i / (buckets - 1)
    const chatter =
      Math.sin(x * 52 + time * 16) * 0.1 +
      Math.sin(x * 118 + time * 29) * 0.05 +
      Math.sin(x * 11 + time * 5.5) * 0.07
    const spike =
      triangle(x, (shift + 0.08) % 1, 0.018, 1) +
      triangle(x, (shift + 0.11) % 1, 0.01, -0.55) +
      triangle(x, (shift + 0.42) % 1, 0.022, 0.52) +
      triangle(x, (shift + 0.46) % 1, 0.012, -0.28) +
      triangle(x, (shift + 0.71) % 1, 0.016, 0.34)
    peaks[i] = chatter + spike
  }
  return peaks
}

function drawWave(ctx, width, height, samples, time) {
  ctx.clearRect(0, 0, width, height)
  const buckets = Math.max(160, Math.floor(width / 3))
  const peaks =
    samples && samples.length > 32 ? livePeaks(samples, buckets) : syntheticPeaks(buckets, time)

  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, '#7CFF3C')
  gradient.addColorStop(0.38, '#2EE6C8')
  gradient.addColorStop(0.68, '#3B82FF')
  gradient.addColorStop(1, '#5CFF7A')

  const mid = height / 2
  ctx.beginPath()
  for (let i = 0; i < buckets; i += 1) {
    const x = (i / (buckets - 1)) * width
    const y = mid - peaks[i] * mid * 0.9
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = gradient
  ctx.lineWidth = 1.8
  ctx.lineJoin = 'miter'
  ctx.miterLimit = 8
  ctx.lineCap = 'butt'
  ctx.stroke()
}

export default function AudioPlayer({ playing, analyserRef, onStop }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!playing) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    let frameId = 0
    let buffer = new Uint8Array(2048)

    const tick = (now) => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.floor(width * ratio)
        canvas.height = Math.floor(height * ratio)
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      }

      const analyser = analyserRef?.current
      if (analyser) {
        if (buffer.length !== analyser.fftSize) buffer = new Uint8Array(analyser.fftSize)
        analyser.getByteTimeDomainData(buffer)
        drawWave(ctx, width, height, buffer, now / 1000)
      } else {
        drawWave(ctx, width, height, null, now / 1000)
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [analyserRef, playing])

  if (!playing) return null

  return (
    <button type="button" className="waveform-stage" onClick={onStop} aria-label="Stop speech">
      <canvas ref={canvasRef} />
    </button>
  )
}
