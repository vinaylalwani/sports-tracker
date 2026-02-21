"use client"

import { useMemo } from "react"
import type { BodyRegionId, BodyRegionRisk } from "@/lib/playerBodyInjuryData"
import { cn } from "@/lib/utils"

interface BodyOutlineProps {
  regions: BodyRegionRisk[]
  className?: string
}

function getRiskFill(risk: number): string {
  if (risk <= 0) return "transparent"
  if (risk < 45) return "rgba(34, 197, 94, 0.55)"
  if (risk < 65) return "rgba(245, 158, 11, 0.6)"
  return "rgba(239, 68, 68, 0.65)"
}

function getRiskStroke(risk: number): string {
  if (risk <= 0) return "transparent"
  if (risk < 45) return "rgba(34, 197, 94, 0.9)"
  if (risk < 65) return "rgba(245, 158, 11, 0.9)"
  return "rgba(239, 68, 68, 0.95)"
}

/** Ellipse overlays – wider front-view figure in viewBox 0 0 100 220 */
const regionOverlays: Record<
  BodyRegionId,
  { cx: number; cy: number; rx: number; ry: number }
> = {
  head: { cx: 50, cy: 18, rx: 18, ry: 16 },
  neck: { cx: 50, cy: 42, rx: 10, ry: 10 },
  shoulder_l: { cx: 24, cy: 52, rx: 12, ry: 10 },
  shoulder_r: { cx: 76, cy: 52, rx: 12, ry: 10 },
  back_upper: { cx: 50, cy: 72, rx: 22, ry: 14 },
  back_lower: { cx: 50, cy: 108, rx: 20, ry: 22 },
  elbow_l: { cx: 18, cy: 82, rx: 10, ry: 10 },
  elbow_r: { cx: 82, cy: 82, rx: 10, ry: 10 },
  wrist_l: { cx: 14, cy: 108, rx: 6, ry: 8 },
  wrist_r: { cx: 86, cy: 108, rx: 6, ry: 8 },
  hip_l: { cx: 34, cy: 138, rx: 12, ry: 12 },
  hip_r: { cx: 66, cy: 138, rx: 12, ry: 12 },
  knee_l: { cx: 36, cy: 172, rx: 11, ry: 12 },
  knee_r: { cx: 64, cy: 172, rx: 11, ry: 12 },
  ankle_l: { cx: 34, cy: 208, rx: 7, ry: 10 },
  ankle_r: { cx: 66, cy: 208, rx: 7, ry: 10 },
  hamstring_l: { cx: 32, cy: 152, rx: 8, ry: 18 },
  hamstring_r: { cx: 68, cy: 152, rx: 8, ry: 18 },
}

/** Clean body silhouette – front view, wider proportions */
const bodyPaths = {
  head: "M50 2 A20 18 0 1 1 50 38 A20 18 0 1 1 50 2 Z",
  neck: "M38 40 L40 52 L60 52 L62 40 Z",
  torso: "M26 52 L74 52 L70 92 L66 128 L64 168 L62 212 L38 212 L36 168 L34 128 L30 92 Z",
  armL: "M26 54 Q12 64 10 86 L14 110 Q16 120 24 116 L28 88 Q30 68 26 54 Z",
  armR: "M74 54 Q88 64 90 86 L86 110 Q84 120 76 116 L72 88 Q70 68 74 54 Z",
}

export function BodyOutline({ regions, className }: BodyOutlineProps) {
  const riskByRegion = useMemo(() => {
    const map = new Map<BodyRegionId, number>()
    regions.forEach((r) => map.set(r.regionId, r.risk))
    return map
  }, [regions])

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative w-full max-w-[180px] mx-auto">
        <svg
          viewBox="0 0 100 220"
          className="w-full h-auto drop-shadow-sm"
          aria-label="Body outline with injury risk by region"
        >
          <defs>
            <linearGradient id="body-base" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity={0.15} />
            </linearGradient>
            <filter id="region-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Base figure – smooth outline */}
          <path d={bodyPaths.head} fill="url(#body-base)" stroke="hsl(var(--border))" strokeWidth="1" strokeLinejoin="round" />
          <path d={bodyPaths.neck} fill="url(#body-base)" stroke="hsl(var(--border))" strokeWidth="1" strokeLinejoin="round" />
          <path d={bodyPaths.torso} fill="url(#body-base)" stroke="hsl(var(--border))" strokeWidth="1" strokeLinejoin="round" />
          <path d={bodyPaths.armL} fill="url(#body-base)" stroke="hsl(var(--border))" strokeWidth="1" strokeLinejoin="round" />
          <path d={bodyPaths.armR} fill="url(#body-base)" stroke="hsl(var(--border))" strokeWidth="1" strokeLinejoin="round" />
          {/* Risk region overlays – ellipses only where risk > 0 */}
          <g filter="url(#region-soft)">
            {(Object.entries(regionOverlays) as [BodyRegionId, typeof regionOverlays[BodyRegionId]][])
              .filter(([regionId]) => (riskByRegion.get(regionId) ?? 0) > 0)
              .map(([regionId]) => {
                const risk = riskByRegion.get(regionId) ?? 0
                const { cx, cy, rx, ry } = regionOverlays[regionId]
                return (
                  <ellipse
                    key={regionId}
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill={getRiskFill(risk)}
                    stroke={getRiskStroke(risk)}
                    strokeWidth="1"
                  />
                )
              })}
          </g>
        </svg>
      </div>
      <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500/70 ring-2 ring-green-500/40" /> Low
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500/70 ring-2 ring-amber-500/40" /> Moderate
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500/70 ring-2 ring-red-500/40" /> High
        </span>
      </div>
      {regions.length > 0 && (
        <ul className="w-full space-y-2 text-left text-sm">
          {regions.slice(0, 6).map((r) => (
            <li
              key={r.regionId}
              className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-md bg-muted/40"
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  r.risk < 45 ? "text-green-500" : r.risk < 65 ? "text-amber-500" : "text-red-500"
                )}
              >
                {r.risk}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
