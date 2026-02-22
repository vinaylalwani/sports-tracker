import type { Game } from "./scheduleData"

let cachedPromise: Promise<{ games: Game[]; isLive: boolean }> | null = null

export function fetchSchedule(): Promise<{ games: Game[]; isLive: boolean }> {
  if (cachedPromise) return cachedPromise

  cachedPromise = (async () => {
    try {
      const res = await fetch("/api/schedule")
      if (res.ok) {
        const data = await res.json()
        if (data.games && data.games.length > 0) {
          return { games: data.games as Game[], isLive: true }
        }
      }
    } catch {
      // Fallback handled by caller
    }
    return { games: [], isLive: false }
  })()

  // Clear after 30 seconds so a later navigation can refetch
  setTimeout(() => { cachedPromise = null }, 30_000)

  return cachedPromise
}
