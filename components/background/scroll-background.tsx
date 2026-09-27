"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import type { SceneColors } from "./scroll-scene"

const ScrollScene = dynamic(() => import("./scroll-scene"), { ssr: false })

const palettes: Record<"dark" | "light", SceneColors> = {
  dark: { stars: "#e2e8f0", orbit: "#64748b", ambient: 0.14 },
  light: { stars: "#64748b", orbit: "#94a3b8", ambient: 0.45 },
}

const subscribeNoop = () => () => {}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

function subscribeReducedMotion(callback: () => void) {
  const media = window.matchMedia(reducedMotionQuery)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

export function ScrollBackground() {
  const { resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  )

  if (!mounted) return null

  const colors = resolvedTheme === "light" ? palettes.light : palettes.dark

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <ScrollScene colors={colors} reducedMotion={reducedMotion} />
      <div className="absolute inset-0 bg-background/30" />
    </div>
  )
}
