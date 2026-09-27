"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

type SceneColors = {
  primary: string
  muted: string
  background: string
}

const scrollState = { progress: 0 }

function readScrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? window.scrollY / max : 0
}

function Particles({ color, count = 1400 }: { color: string; count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 6 + Math.random() * 14
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = (Math.random() - 0.5) * 40
      arr[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 6
    }
    return arr
  }, [count])

  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.02
    ref.current.position.y = scrollState.progress * 18
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.045}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  )
}

function FloatingShapes({ colors }: { colors: SceneColors }) {
  const shapes = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2
        return {
          position: [
            Math.cos(angle) * (4.5 + (i % 3)),
            -i * 2.2 + 3,
            Math.sin(angle) * (3 + (i % 2)) - 2,
          ] as [number, number, number],
          scale: 0.25 + (i % 4) * 0.12,
          speed: 0.3 + (i % 5) * 0.1,
          kind: i % 3,
        }
      }),
    [],
  )
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.position.y = scrollState.progress * 22
    group.current.rotation.y = scrollState.progress * Math.PI * 1.5
    group.current.children.forEach((child, i) => {
      const s = shapes[i]
      child.rotation.x = t * s.speed
      child.rotation.z = t * s.speed * 0.6
      child.position.y = s.position[1] + Math.sin(t * s.speed + i) * 0.25
    })
  })

  return (
    <group ref={group}>
      {shapes.map((s, i) => (
        <mesh key={i} position={s.position} scale={s.scale}>
          {s.kind === 0 && <octahedronGeometry args={[1, 0]} />}
          {s.kind === 1 && <tetrahedronGeometry args={[1, 0]} />}
          {s.kind === 2 && <boxGeometry args={[1, 1, 1]} />}
          <meshBasicMaterial
            color={i % 2 === 0 ? colors.primary : colors.muted}
            wireframe
            transparent
            opacity={0.55}
          />
        </mesh>
      ))}
    </group>
  )
}

function CoreObject({ colors }: { colors: SceneColors }) {
  const outer = useRef<THREE.Mesh>(null)
  const inner = useRef<THREE.Mesh>(null)
  const group = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    const p = scrollState.progress
    if (outer.current) {
      outer.current.rotation.x += delta * 0.08
      outer.current.rotation.y = p * Math.PI * 3 + state.clock.elapsedTime * 0.05
    }
    if (inner.current) {
      inner.current.rotation.x = -p * Math.PI * 4
      inner.current.rotation.y -= delta * 0.15
    }
    if (group.current) {
      const targetX = Math.sin(p * Math.PI * 2) * 2.6
      const targetScale = 1 - Math.sin(p * Math.PI) * 0.35
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, 0.08)
      group.current.scale.setScalar(
        THREE.MathUtils.lerp(group.current.scale.x, targetScale, 0.08),
      )
    }
  })

  return (
    <group ref={group}>
      <mesh ref={outer}>
        <icosahedronGeometry args={[2.1, 1]} />
        <meshBasicMaterial color={colors.primary} wireframe transparent opacity={0.35} />
      </mesh>
      <mesh ref={inner}>
        <torusKnotGeometry args={[0.95, 0.28, 140, 16]} />
        <meshBasicMaterial color={colors.muted} wireframe transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

function CameraRig() {
  const pointer = useRef({ x: 0, y: 0 })

  useFrame((state) => {
    const target = readScrollProgress()
    scrollState.progress = THREE.MathUtils.lerp(scrollState.progress, target, 0.08)

    pointer.current.x = THREE.MathUtils.lerp(pointer.current.x, state.pointer.x, 0.05)
    pointer.current.y = THREE.MathUtils.lerp(pointer.current.y, state.pointer.y, 0.05)

    const cam = state.camera
    cam.position.x = pointer.current.x * 0.6
    cam.position.y = pointer.current.y * 0.4
    cam.position.z = 8 - Math.sin(scrollState.progress * Math.PI) * 2
    cam.lookAt(0, 0, 0)
  })

  return null
}

export default function ScrollScene({ colors }: { colors: SceneColors }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 55 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <fog attach="fog" args={[colors.background, 7, 22]} />
      <CameraRig />
      <CoreObject colors={colors} />
      <FloatingShapes colors={colors} />
      <Particles color={colors.primary} />
    </Canvas>
  )
}
