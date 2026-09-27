"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

export type SceneColors = {
  stars: string
  orbit: string
  ambient: number
}

type SurfaceSpec = {
  base: string
  bands?: string[]
  spots?: string[]
  spotCount?: number
  spotSize?: [number, number]
  polarCaps?: boolean
  clouds?: boolean
  seed: number
}

type PlanetSpec = {
  name: string
  radius: number
  distance: number
  speed: number
  spin: number
  tilt: number
  surface: SurfaceSpec
  ring?: { inner: number; outer: number; colors: string[] }
  moon?: boolean
}

const scrollState = { progress: 0 }

function readScrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? window.scrollY / max : 0
}

function seededRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createSurfaceTexture(spec: SurfaceSpec) {
  const width = 512
  const height = 256
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  const rand = seededRandom(spec.seed)

  ctx.fillStyle = spec.base
  ctx.fillRect(0, 0, width, height)

  if (spec.bands) {
    let y = 0
    while (y < height) {
      const h = 4 + rand() * 22
      ctx.globalAlpha = 0.35 + rand() * 0.5
      ctx.fillStyle = spec.bands[Math.floor(rand() * spec.bands.length)]
      for (let x = 0; x < width; x += 8) {
        const wobble = Math.sin((x / width) * Math.PI * 6 + y) * 2
        ctx.fillRect(x, y + wobble, 8, h)
      }
      y += h
    }
  }

  if (spec.spots) {
    const [minSize, maxSize] = spec.spotSize ?? [4, 24]
    for (let i = 0; i < (spec.spotCount ?? 60); i++) {
      ctx.globalAlpha = 0.3 + rand() * 0.6
      ctx.fillStyle = spec.spots[Math.floor(rand() * spec.spots.length)]
      const x = rand() * width
      const y = height * 0.12 + rand() * height * 0.76
      const r = minSize + rand() * (maxSize - minSize)
      ctx.beginPath()
      ctx.ellipse(x, y, r * (1 + rand()), r, rand() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (spec.clouds) {
    ctx.fillStyle = "#ffffff"
    for (let i = 0; i < 40; i++) {
      ctx.globalAlpha = 0.15 + rand() * 0.3
      const x = rand() * width
      const y = rand() * height
      ctx.beginPath()
      ctx.ellipse(x, y, 20 + rand() * 50, 3 + rand() * 6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (spec.polarCaps) {
    ctx.globalAlpha = 0.95
    ctx.fillStyle = "#f1f5f9"
    ctx.fillRect(0, 0, width, height * 0.07)
    ctx.fillRect(0, height * 0.93, width, height * 0.07)
  }

  ctx.globalAlpha = 1
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function createGlowTexture() {
  const size = 256
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(255, 220, 140, 1)")
  gradient.addColorStop(0.25, "rgba(255, 170, 60, 0.55)")
  gradient.addColorStop(0.6, "rgba(255, 120, 30, 0.12)")
  gradient.addColorStop(1, "rgba(255, 100, 20, 0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createRingTexture(colors: string[], seed: number) {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 8
  const ctx = canvas.getContext("2d")!
  const rand = seededRandom(seed)
  let x = 0
  while (x < canvas.width) {
    const w = 2 + rand() * 14
    ctx.globalAlpha = rand() < 0.12 ? 0.08 : 0.45 + rand() * 0.5
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)]
    ctx.fillRect(x, 0, w, canvas.height)
    x += w
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const PLANETS: PlanetSpec[] = [
  {
    name: "Mercury",
    radius: 0.38,
    distance: 6,
    speed: 0.9,
    spin: 0.2,
    tilt: 0.01,
    surface: { base: "#9a9189", spots: ["#6f6760", "#b8b0a6", "#57504a"], spotCount: 120, spotSize: [2, 10], seed: 11 },
  },
  {
    name: "Venus",
    radius: 0.7,
    distance: 8.6,
    speed: 0.65,
    spin: 0.1,
    tilt: 3.1,
    surface: { base: "#d9b777", bands: ["#e8cf99", "#c49a55", "#f0dcb0"], seed: 22 },
  },
  {
    name: "Earth",
    radius: 0.75,
    distance: 11.4,
    speed: 0.5,
    spin: 0.9,
    tilt: 0.41,
    surface: {
      base: "#1e5fa8",
      spots: ["#3f8a3a", "#2f6d2c", "#8a7a4a", "#4f9a44"],
      spotCount: 55,
      spotSize: [10, 36],
      polarCaps: true,
      clouds: true,
      seed: 33,
    },
    moon: true,
  },
  {
    name: "Mars",
    radius: 0.52,
    distance: 14.4,
    speed: 0.4,
    spin: 0.85,
    tilt: 0.44,
    surface: {
      base: "#b8532e",
      spots: ["#8a3a1f", "#d2774a", "#6e2c17"],
      spotCount: 90,
      spotSize: [4, 18],
      polarCaps: true,
      seed: 44,
    },
  },
  {
    name: "Jupiter",
    radius: 1.9,
    distance: 19.5,
    speed: 0.22,
    spin: 1.6,
    tilt: 0.05,
    surface: {
      base: "#c9a37c",
      bands: ["#e6d2b5", "#a8754f", "#d9b48c", "#8c5a3a", "#f1e4cf"],
      spots: ["#b5532f"],
      spotCount: 1,
      spotSize: [14, 16],
      seed: 55,
    },
  },
  {
    name: "Saturn",
    radius: 1.6,
    distance: 25.5,
    speed: 0.16,
    spin: 1.4,
    tilt: 0.47,
    surface: { base: "#dcc38f", bands: ["#e9d8ae", "#c6a867", "#f2e6c6", "#b8995c"], seed: 66 },
    ring: { inner: 2.1, outer: 3.6, colors: ["#d8c49a", "#bfa77a", "#efe2c2", "#9c8763"] },
  },
  {
    name: "Uranus",
    radius: 1.1,
    distance: 30.5,
    speed: 0.11,
    spin: 1.0,
    tilt: 1.7,
    surface: { base: "#9fd8e0", bands: ["#b8e6ec", "#8ccbd6"], seed: 77 },
    ring: { inner: 1.5, outer: 1.8, colors: ["#b8e6ec", "#7fb4bd"] },
  },
  {
    name: "Neptune",
    radius: 1.05,
    distance: 35,
    speed: 0.09,
    spin: 1.05,
    tilt: 0.49,
    surface: {
      base: "#3a5fd0",
      bands: ["#4b73e0", "#2c4bb0", "#5a82e8"],
      spots: ["#1e3590"],
      spotCount: 2,
      spotSize: [8, 12],
      seed: 88,
    },
  },
  {
    name: "Pluto",
    radius: 0.28,
    distance: 39,
    speed: 0.07,
    spin: 0.3,
    tilt: 2.1,
    surface: { base: "#c7b299", spots: ["#8f7a63", "#e8dccb", "#6b5a48"], spotCount: 50, spotSize: [4, 16], seed: 99 },
  },
]

function Starfield({ color, count = 3500 }: { color: string; count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const rand = seededRandom(7)
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 120 + rand() * 180
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = radius * Math.cos(phi)
      arr[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [count])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.004
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={1.6} sizeAttenuation={false} transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}

function Sun({ timeScale }: { timeScale: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const surface = useMemo(
    () =>
      createSurfaceTexture({
        base: "#ffb21f",
        spots: ["#ffd65a", "#ff9a2a", "#ffe9a0", "#ff7a10"],
        spotCount: 1400,
        spotSize: [1, 4],
        seed: 1,
      }),
    [],
  )
  const glow = useMemo(() => createGlowTexture(), [])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05 * timeScale
  })

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[3, 64, 64]} />
        <meshBasicMaterial map={surface} toneMapped={false} />
      </mesh>
      <sprite scale={[16, 16, 1]}>
        <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
      </sprite>
      <pointLight intensity={2.6} decay={0} distance={0} color="#fff1d6" />
    </group>
  )
}

function OrbitPath({ radius, color }: { radius: number; color: string }) {
  const geometry = useMemo(() => {
    const points = Array.from({ length: 161 }, (_, i) => {
      const a = (i / 160) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)
    })
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [radius])

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} />
    </lineLoop>
  )
}

function PlanetRing({ inner, outer, colors, seed }: { inner: number; outer: number; colors: string[]; seed: number }) {
  const { geometry, texture } = useMemo(() => {
    const geo = new THREE.RingGeometry(inner, outer, 128, 1)
    const pos = geo.attributes.position
    const uv = geo.attributes.uv
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5)
    }
    return { geometry: geo, texture: createRingTexture(colors, seed) }
  }, [inner, outer, colors, seed])

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent depthWrite={false} roughness={1} />
    </mesh>
  )
}

function Moon({ timeScale }: { timeScale: number }) {
  const pivot = useRef<THREE.Group>(null)
  const texture = useMemo(
    () =>
      createSurfaceTexture({
        base: "#b9b6b0",
        spots: ["#8a8781", "#6f6c67", "#d4d1cb"],
        spotCount: 110,
        spotSize: [3, 12],
        seed: 5,
      }),
    [],
  )

  useFrame((_, delta) => {
    if (pivot.current) pivot.current.rotation.y += delta * 1.2 * timeScale
  })

  return (
    <group ref={pivot} rotation={[0.1, 0, 0]}>
      <mesh position={[1.45, 0, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial map={texture} roughness={1} />
      </mesh>
    </group>
  )
}

function Planet({ spec, index, timeScale }: { spec: PlanetSpec; index: number; timeScale: number }) {
  const orbit = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const texture = useMemo(() => createSurfaceTexture(spec.surface), [spec.surface])
  const startAngle = useMemo(() => index * 2.39996, [index])

  useFrame((state, delta) => {
    if (orbit.current) {
      orbit.current.rotation.y = startAngle + state.clock.elapsedTime * spec.speed * 0.12 * timeScale
    }
    if (body.current) body.current.rotation.y += delta * spec.spin * 0.3 * timeScale
  })

  return (
    <group ref={orbit}>
      <group position={[spec.distance, 0, 0]}>
        <group rotation={[0, 0, spec.tilt]}>
          <mesh ref={body}>
            <sphereGeometry args={[spec.radius, 48, 48]} />
            <meshStandardMaterial map={texture} roughness={0.9} metalness={0} />
          </mesh>
          {spec.ring && (
            <PlanetRing
              inner={spec.ring.inner}
              outer={spec.ring.outer}
              colors={spec.ring.colors}
              seed={spec.surface.seed + 1}
            />
          )}
        </group>
        {spec.moon && <Moon timeScale={timeScale} />}
      </group>
    </group>
  )
}

function SolarSystem({ colors, timeScale }: { colors: SceneColors; timeScale: number }) {
  return (
    <group rotation={[0.08, 0, 0.04]}>
      <Sun timeScale={timeScale} />
      {PLANETS.map((planet, i) => (
        <group key={planet.name}>
          <OrbitPath radius={planet.distance} color={colors.orbit} />
          <Planet spec={planet} index={i} timeScale={timeScale} />
        </group>
      ))}
    </group>
  )
}

function CameraRig() {
  const pointer = useRef({ x: 0, y: 0 })
  const lookTarget = useRef(new THREE.Vector3())

  useFrame((state) => {
    scrollState.progress = THREE.MathUtils.lerp(scrollState.progress, readScrollProgress(), 0.07)
    const p = scrollState.progress

    pointer.current.x = THREE.MathUtils.lerp(pointer.current.x, state.pointer.x, 0.04)
    pointer.current.y = THREE.MathUtils.lerp(pointer.current.y, state.pointer.y, 0.04)

    const distance = 18 + p * 42
    const azimuth = -0.6 + p * Math.PI * 1.6 + pointer.current.x * 0.15
    const height = 4 + Math.sin(p * Math.PI) * 14 + p * 6 + pointer.current.y * 2

    const cam = state.camera
    cam.position.set(Math.sin(azimuth) * distance, height, Math.cos(azimuth) * distance)

    const side = THREE.MathUtils.lerp(-7, 0, Math.min(p * 2.5, 1))
    lookTarget.current.set(
      Math.cos(azimuth) * side,
      0,
      -Math.sin(azimuth) * side,
    )
    cam.lookAt(lookTarget.current)
  })

  return null
}

export default function ScrollScene({ colors, reducedMotion }: { colors: SceneColors; reducedMotion: boolean }) {
  const timeScale = reducedMotion ? 0.15 : 1

  return (
    <Canvas
      camera={{ position: [0, 4, 18], fov: 55, near: 0.1, far: 800 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <ambientLight intensity={colors.ambient} />
      <CameraRig />
      <Starfield color={colors.stars} />
      <SolarSystem colors={colors} timeScale={timeScale} />
    </Canvas>
  )
}
