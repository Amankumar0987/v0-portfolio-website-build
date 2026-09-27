"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

const ScrollScene = dynamic(() => import("./scroll-scene"), { ssr: false })

const palettes = {
  dark: { primary: "#22c3d6", muted: "#64748b", background: "#0f1420" },
  light: { primary: "#0e8fa3", muted: "#94a3b8", background: "#f8fafc" },
}

const subscribeNoop = () => () => {}

export function ScrollBackground() {
  const { resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )

  if (!mounted) return null

  const colors = resolvedTheme === "light" ? palettes.light : palettes.dark

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <ScrollScene colors={colors} />
    </div>
  )
}
