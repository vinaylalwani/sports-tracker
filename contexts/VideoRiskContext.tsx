"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "sports-tracker-video-combined-risks"

type VideoRiskState = Record<string, number>

type VideoRiskContextValue = {
  videoCombinedRisks: VideoRiskState
  updatePlayerRisk: (playerId: string, videoRisk: number, baselineRisk: number) => void
}

const VideoRiskContext = createContext<VideoRiskContextValue | null>(null)

function loadFromStorage(): VideoRiskState {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToStorage(state: VideoRiskState) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

/** Video impact on combined risk: 5%. Combined = baseline * 0.95 + video * 0.05 */
const VIDEO_WEIGHT = 0.05
const BASELINE_WEIGHT = 1 - VIDEO_WEIGHT

export function VideoRiskProvider({ children }: { children: React.ReactNode }) {
  const [videoCombinedRisks, setVideoCombinedRisks] = useState<VideoRiskState>(loadFromStorage)

  useEffect(() => {
    saveToStorage(videoCombinedRisks)
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
