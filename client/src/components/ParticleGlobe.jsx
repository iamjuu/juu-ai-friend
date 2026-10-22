import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PHOTO_URL = '/juu-portrait.jpg'
const COLUMNS = 168

function springStep(value, velocity, target, stiffness, damping, dt) {
  const nextVelocity = velocity + ((target - value) * stiffness - velocity * damping) * dt
  return {
    value: value + nextVelocity * dt,
    velocity: nextVelocity,
  }
}

function loadPhoto(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const source = document.createElement('canvas')
      source.width = image.naturalWidth
      source.height = image.naturalHeight
      const context = source.getContext('2d', { willReadFrequently: true })
      context.drawImage(image, 0, 0)
      resolve({
        width: source.width,
        height: source.height,
        pixels: context.getImageData(0, 0, source.width, source.height).data,
      })
    }
    image.onerror = () => reject(new Error('Could not load the photograph'))
    image.src = url
  })
}

function buildSamples(photo) {
  const originX = photo.width * 0.04
  const originY = 0
  const cropW = photo.width * 0.92
  const cropH = photo.height
  const imageAspect = cropW / cropH
  const rows = Math.round(COLUMNS / imageAspect)
  const imagePositions = []
  const globePositions = []
  const brightness = []
  const phases = []
  const speeds = []
  const packed = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const sampleX = Math.min(
        photo.width - 1,
        Math.floor(originX + ((column + 0.5) / COLUMNS) * cropW)
      )
      const sampleY = Math.min(
        photo.height - 1,
        Math.floor(originY + ((row + 0.5) / rows) * cropH)
      )
      const pixel = (sampleY * photo.width + sampleX) * 4
      const r = photo.pixels[pixel] / 255
      const g = photo.pixels[pixel + 1] / 255
      const b = photo.pixels[pixel + 2] / 255
      packed.push({
        column,
        row,
        luma: Math.pow(0.2126 * r + 0.7152 * g + 0.0722 * b, 0.92),
      })
    }
  }

  const count = packed.length
  const globeYaw = Math.random() * Math.PI * 2
  const yawCos = Math.cos(globeYaw)
  const yawSin = Math.sin(globeYaw)
  const tilt = -0.22

  packed.forEach((item, index) => {
    brightness.push(item.luma)
    phases.push(Math.random() * Math.PI * 2)
    speeds.push(0.7 + Math.random() * 0.35)
    imagePositions.push((item.column + 0.5) / COLUMNS, (item.row + 0.5) / rows, 0)

    const sphereY = 1 - (index / Math.max(count - 1, 1)) * 2
    const ringRadius = Math.sqrt(Math.max(0, 1 - sphereY * sphereY))
    const angle = index * 2.39996323
    const sphereX = Math.cos(angle) * ringRadius
    const sphereZ = Math.sin(angle) * ringRadius
    const spunX = sphereX * yawCos + sphereZ * yawSin
    const spunZ = -sphereX * yawSin + sphereZ * yawCos
    globePositions.push(
      spunX,
      sphereY * Math.cos(tilt) - spunZ * Math.sin(tilt),
      sphereY * Math.sin(tilt) + spunZ * Math.cos(tilt)
    )
  })

  return {
    count,
    imageAspect,
    columns: COLUMNS,
    imagePositions: new Float32Array(imagePositions),
    globePositions: new Float32Array(globePositions),
    brightness: new Float32Array(brightness),
    phases: new Float32Array(phases),
    speeds: new Float32Array(speeds),
  }
}

export default function ParticleGlobe({ state = 'idle' }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return undefined
    let disposed = false
    let renderer
    let frameId = 0
    let resizeObserver

    const pointer = { inside: false }
    const onEnter = () => {
      pointer.inside = true
    }
    const onLeave = () => {
      pointer.inside = false
    }

    stage.addEventListener('pointerenter', onEnter)
    stage.addEventListener('pointerleave', onLeave)

    const start = async () => {
      const photo = await loadPhoto(PHOTO_URL)
      if (disposed) return
      const samples = buildSamples(photo)

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace

      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
      camera.position.z = 4

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(samples.count * 3), 3))
      geometry.setAttribute('imagePosition', new THREE.BufferAttribute(samples.imagePositions.slice(), 3))
      geometry.setAttribute('globePosition', new THREE.BufferAttribute(samples.globePositions.slice(), 3))
      geometry.setAttribute('brightness', new THREE.BufferAttribute(samples.brightness, 1))
      geometry.setAttribute('phase', new THREE.BufferAttribute(samples.phases, 1))
      geometry.setAttribute('speed', new THREE.BufferAttribute(samples.speeds, 1))

      const uniforms = {
        uImage: { value: 0 },
        uTime: { value: 0 },
        uLive: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uPoint: { value: 2.8 },
      }

      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms,
        vertexShader: `
          attribute vec3 imagePosition;
          attribute vec3 globePosition;
          attribute float brightness;
          attribute float phase;
          attribute float speed;
          uniform float uImage;
          uniform float uTime;
          uniform float uLive;
          uniform float uPixelRatio;
          uniform float uPoint;
          varying float vBright;
          varying float vImage;
          void main() {
            vec3 turbulence = vec3(
              sin(uTime * (speed + 0.6) + phase),
              cos(uTime * (speed + 0.37) + phase * 1.71),
              sin(uTime * (speed + 0.22) + phase * 2.13)
            ) * (0.04 + uLive * 0.03) * (1.0 - uImage);
            vec3 pos = mix(globePosition + turbulence, imagePosition, uImage);
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            float globeSize = 2.6 + uLive * 0.7;
            float imageSize = mix(1.4, uPoint, 0.35 + brightness * 0.65);
            gl_PointSize = mix(globeSize, imageSize, uImage) * uPixelRatio;
            vBright = brightness;
            vImage = uImage;
          }
        `,
        fragmentShader: `
          varying float vBright;
          varying float vImage;
          void main() {
            vec2 point = gl_PointCoord - 0.5;
            float dist = length(point);
            if (dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.18, dist);
            float shade = mix(0.85, 0.22 + vBright * 0.95, vImage);
            vec3 green = vec3(0.18, 0.92, 0.52) * shade;
            gl_FragColor = vec4(green, alpha * mix(0.95, 0.3 + vBright * 0.7, vImage));
          }
        `,
      })

      const globe = new THREE.Group()
      const points = new THREE.Points(geometry, material)
      globe.add(points)
      scene.add(globe)

      const layout = () => {
        const width = Math.max(stage.clientWidth, 1)
        const height = Math.max(stage.clientHeight, 1)
        const aspect = width / height
        renderer.setSize(width, height, false)
        camera.left = -aspect
        camera.right = aspect
        camera.top = 1
        camera.bottom = -1
        camera.updateProjectionMatrix()
        uniforms.uPixelRatio.value = renderer.getPixelRatio()

        const globeRadius = Math.min(0.7, aspect * 0.58)
        const imageHalfHeight = Math.min(0.88, (0.7 * aspect) / samples.imageAspect)
        const imageHalfWidth = imageHalfHeight * samples.imageAspect
        const imageAttr = geometry.getAttribute('imagePosition')
        const globeAttr = geometry.getAttribute('globePosition')
        const sourceImage = samples.imagePositions
        const sourceGlobe = samples.globePositions

        for (let index = 0; index < samples.count; index += 1) {
          const i = index * 3
          imageAttr.setXYZ(
            index,
            (sourceImage[i] - 0.5) * imageHalfWidth * 2,
            (0.5 - sourceImage[i + 1]) * imageHalfHeight * 2,
            0
          )
          globeAttr.setXYZ(
            index,
            sourceGlobe[i] * globeRadius,
            sourceGlobe[i + 1] * globeRadius,
            sourceGlobe[i + 2] * globeRadius
          )
        }
        imageAttr.needsUpdate = true
        globeAttr.needsUpdate = true
        geometry.computeBoundingSphere()
        uniforms.uPoint.value = Math.max(2.2, (imageHalfWidth * 2 * 240) / samples.columns)
      }

      resizeObserver = new ResizeObserver(layout)
      resizeObserver.observe(stage)
      layout()
      canvas.dataset.ready = 'true'

      let imageMix = 0
      let imageVelocity = 0
      let idleYaw = 0
      let last = performance.now()

      const tick = (now) => {
        if (disposed) return
        const dt = Math.min(0.033, (now - last) / 1000)
        last = now
        const live = ['listening', 'speaking', 'thinking', 'transcribing', 'generating_speech'].includes(
          stateRef.current
        )
        uniforms.uTime.value = now / 1000
        uniforms.uLive.value += ((live ? 1 : 0) - uniforms.uLive.value) * 0.08

        const next = springStep(imageMix, imageVelocity, pointer.inside ? 1 : 0, 52, 13, dt)
        imageMix = THREE.MathUtils.clamp(next.value, 0, 1)
        imageVelocity = next.velocity
        uniforms.uImage.value = imageMix

        if (!pointer.inside) idleYaw += 0.004 + uniforms.uLive.value * 0.008
        globe.rotation.y = idleYaw * (1 - imageMix)
        globe.rotation.x = Math.sin(now / 4200) * 0.12 * (1 - imageMix)
        renderer.render(scene, camera)
        frameId = requestAnimationFrame(tick)
      }

      frameId = requestAnimationFrame(tick)
    }

    start().catch((error) => console.error(error))

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
      stage.removeEventListener('pointerenter', onEnter)
      stage.removeEventListener('pointerleave', onLeave)
      renderer?.dispose()
    }
  }, [])

  return (
    <div ref={stageRef} className="particle-stage">
      <canvas ref={canvasRef} aria-label="Hover to form a dotted portrait" />
    </div>
  )
}
