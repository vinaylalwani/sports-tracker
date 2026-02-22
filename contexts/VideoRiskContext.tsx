"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"

const STORAGE_KEY = "sports-tracker-video-combined-risks"

type VideoRiskState = Record<string, number>

type VideoRiskContextValue = {
  videoCombinedRisks: VideoRiskState
  updatePlayerRisk: (playerId: string, videoRisk: number, baselineRisk: number) => void
}

const VideoRiskContext = createContext<VideoRiskContextValue | null>(null)

/** Video impact on combined risk: 5%. Combined = baseline * 0.95 + video * 0.05 */
const VIDEO_WEIGHT = 0.05
const BASELINE_WEIGHT = 1 - VIDEO_WEIGHT

export function VideoRiskProvider({ children }: { children: React.ReactNode }) {
  // Always initialize with empty object to avoid hydration mismatch
  const [videoCombinedRisks, setVideoCombinedRisks] = useState<VideoRiskState>({})
  const hydrated = useRef(false)

  // Load from localStorage ONLY on the client after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") {
          setVideoCombinedRisks(parsed)
        }
      }
    } catch {
      // ignore
    }
    hydrated.current = true
  }, [])

  // Persist to localStorage whenever state changes (but only after initial hydration)
  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(videoCombinedRisks))
    } catch {
      // ignore
    }
  }, [videoCombinedRisks])

  const updatePlayerRisk = useCallback((playerId: string, videoRisk: number, baselineRisk: number) => {
    const combined = baselineRisk * BASELINE_WEIGHT + videoRisk * VIDEO_WEIGHT
    setVideoCombinedRisks((prev) => ({
      ...prev,
      [playerId]: parseFloat(Math.max(0, Math.min(100, combined)).toFixed(2)),
    }))
  }, [])

  return (
    <VideoRiskContext.Provider value={{ videoCombinedRisks, updatePlayerRisk }}>
      {children}
    </VideoRiskContext.Provider>
  )
}

export function useVideoRisk() {
  const ctx = useContext(VideoRiskContext)
  if (!ctx) {
    return {
      videoCombinedRisks: {} as VideoRiskState,
      updatePlayerRisk: (_playerId: string, _videoRisk: number, _baselineRisk: number) => {},
    }
  }
  return ctx
}
