"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  Play,
  BarChart3,
  Zap,
  Activity,
  Shield,
  TrendingUp,
  AlertTriangle,
  X,
  User,
  Loader2,
  Target,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  CheckCircle2,
  Users,
  Minus,
  History,
  Trash2,
  AlertOctagon,
  HeartPulse,
} from "lucide-react"
import {
  analyzeMultiPlayers,
  detectPlayers,
  checkApiHealth,
  saveAnalysisToHistory,
  getAnalysisHistory,
  clearAnalysisHistory,
  type AnalysisResult,
  type DetectedPlayer,
  type RiskFactor,
  type SelectedPlayer,
  type AnalysisHistoryEntry,
} from "@/lib/videoAnalysisApi"

interface Props {
  onRiskComputed?: (risk: number) => void
  onAnalysisComplete?: (results: AnalysisResult[]) => void
}

type PanelStep = "upload" | "select-players" | "ready" | "analyzing" | "results"

export function VideoAnalysisPanel({ onRiskComputed, onAnalysisComplete }: Props) {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [hasVideo, setHasVideo] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<PanelStep>("upload")

  const [detectedPlayers, setDetectedPlayers] = useState<DetectedPlayer[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([])
  const [detectionFrameImage, setDetectionFrameImage] = useState<string | null>(null)
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [hoveredTrackId, setHoveredTrackId] = useState<number | null>(null)
  const [editingNameId, setEditingNameId] = useState<number | null>(null)

  const [playerResults, setPlayerResults] = useState<AnalysisResult[]>([])
  const [activeResultIdx, setActiveResultIdx] = useState(0)

  const [showDetails, setShowDetails] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => { checkApiHealth().then(setApiOnline) }, [])
  useEffect(() => { setHistory(getAnalysisHistory()) }, [])
  useEffect(() => { return () => { if (videoUrl) URL.revokeObjectURL(videoUrl) } }, [videoUrl])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("video/")) { setError("Please select a video file"); return }
    if (file.size > 200 * 1024 * 1024) { setError("Video too large (max 200MB)"); return }
    setError(null); setVideoFile(file)
    const url = URL.createObjectURL(file)
    setVideoUrl(url); setHasVideo(true); setPlayerResults([])
    setSelectedPlayers([]); setDetectedPlayers([]); setDetectionFrameImage(null)
    setStep("select-players"); detectPlayersFromFile(file)
  }

  const detectPlayersFromFile = async (file: File) => {
    setIsDetecting(true); setError(null)
    try {
      const result = await detectPlayers(file, 30)
      if (!result.success) { setError(result.error || "Detection failed"); setStep("upload"); return }
      setDetectedPlayers(result.players || [])
      setDetectionFrameImage(result.frame_image || null)
      setFrameSize(result.frame_size || null)
    } catch (err) { setError(err instanceof Error ? err.message : "Detection failed"); setStep("upload") }
    finally { setIsDetecting(false) }
  }

  const togglePlayer = (trackId: number) => {
    setSelectedPlayers((prev) => {
      const exists = prev.find((p) => p.track_id === trackId)
      if (exists) return prev.filter((p) => p.track_id !== trackId)
      if (prev.length >= 5) return prev
      return [...prev, { track_id: trackId, name: `Player ${trackId}` }]
    })
  }

  const updatePlayerName = (trackId: number, name: string) => {
    setSelectedPlayers((prev) => prev.map((p) => (p.track_id === trackId ? { ...p, name } : p)))
  }

  const handleAnalyze = async () => {
    if (!videoFile || selectedPlayers.length === 0) return
    setStep("analyzing"); setError(null)
    try {
      const result = await analyzeMultiPlayers(videoFile, selectedPlayers, 2)
      if (result.success && result.results) {
        setPlayerResults(result.results); setActiveResultIdx(0); setStep("results")
        const successResults = result.results.filter((r) => r.success && r.risk)
        if (successResults.length > 0) {
          onRiskComputed?.(Math.max(...successResults.map((r) => r.risk!.overall_risk_score)))
        }
        onAnalysisComplete?.(result.results)
        // Save to history
        const entry = saveAnalysisToHistory(videoFile.name, result.results)
        setHistory((prev) => [entry, ...prev].slice(0, 50))
      } else { setError(result.error || "Analysis failed"); setStep("ready") }
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); setStep("ready") }
  }

  const handleReset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(null); setVideoFile(null); setHasVideo(false)
    setPlayerResults([]); setError(null); setDetectedPlayers([])
    setSelectedPlayers([]); setDetectionFrameImage(null)
    setStep("upload"); setShowDetails(false); setActiveResultIdx(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleClearHistory = () => { clearAnalysisHistory(); setHistory([]) }

  const getRiskColor = (s: number) => s >= 70 ? "text-red-500" : s >= 40 ? "text-yellow-500" : s >= 20 ? "text-blue-400" : "text-green-400"
  const getRiskBg = (s: number) => s >= 70 ? "bg-red-500" : s >= 40 ? "bg-yellow-500" : s >= 20 ? "bg-blue-400" : "bg-green-400"
  const getCategoryBadge = (cat: string) => {
    const m: Record<string, { className: string; label: string }> = {
      high: { className: "bg-red-500/20 text-red-400 border-red-500/30", label: "High Risk" },
      moderate: { className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Moderate Risk" },
      low: { className: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Low Risk" },
      minimal: { className: "bg-green-500/20 text-green-400 border-green-500/30", label: "Minimal Risk" },
    }
    return m[cat] || m.minimal
  }
  const riskFactorIcon = (f: string) => {
    const m: Record<string, typeof Activity> = {
      knee_flexion: Activity, hip_control: Shield, trunk_stability: TrendingUp,
      knee_symmetry: BarChart3, jump_load: Zap, contact: AlertTriangle, injury_indicators: HeartPulse,
    }
    return m[f] || Activity
  }

  const isPlayerSelected = (tid: number) => selectedPlayers.some((p) => p.track_id === tid)
  const getSelectionIndex = (tid: number) => selectedPlayers.findIndex((p) => p.track_id === tid)
  const activeResult = playerResults[activeResultIdx] || null

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-[#FDB927]" />Video Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedPlayers.length > 0 && step !== "upload" && step !== "results" && (
              <Badge variant="outline" className="border-[#FDB927]/50 text-[#FDB927]">
                <Users className="h-3 w-3 mr-1" />{selectedPlayers.length}/5
              </Badge>
            )}
            {apiOnline !== null && (
              <Badge variant="outline" className={apiOnline ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>
                {apiOnline ? "API Online" : "API Offline"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {apiOnline === false && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-400">Vision API is offline. Start it with:</p>
            <code className="text-xs mt-1 block text-yellow-300/80">cd ml && python api_server.py</code>
          </div>
        )}

        {/* PLAYER SELECTION */}
        {step === "select-players" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FDB927]/10 border border-[#FDB927]/30">
              <MousePointerClick className="h-5 w-5 text-[#FDB927] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#FDB927]">Select players to track (up to 5)</p>
                <p className="text-xs text-muted-foreground">Click on each player you want to analyze</p>
              </div>
            </div>

            {isDetecting ? (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#FDB927]" />
                  <p className="text-sm text-muted-foreground">Detecting players...</p>
                </div>
              </div>
            ) : detectionFrameImage ? (
              <div className="relative w-full rounded-lg overflow-hidden border-2 border-[#FDB927]/40 bg-black">
                <img src={detectionFrameImage} alt="Detection" className="w-full h-auto object-contain" draggable={false} />
                {detectedPlayers.map((p) => {
                  if (!frameSize) return null
                  const sx = 100 / frameSize.width, sy = 100 / frameSize.height
                  const sel = isPlayerSelected(p.track_id), hov = hoveredTrackId === p.track_id
                  const idx = getSelectionIndex(p.track_id)
                  return (
                    <div key={p.track_id} onClick={() => togglePlayer(p.track_id)}
                      onMouseEnter={() => setHoveredTrackId(p.track_id)} onMouseLeave={() => setHoveredTrackId(null)}
                      className={`absolute cursor-pointer transition-all duration-150 ${sel ? "border-[3px] border-[#FDB927] bg-[#FDB927]/25 shadow-lg shadow-[#FDB927]/20" : hov ? "border-2 border-white/80 bg-white/15" : "border-2 border-green-400/50 bg-transparent"}`}
                      style={{ left: `${p.bbox.x1 * sx}%`, top: `${p.bbox.y1 * sy}%`, width: `${(p.bbox.x2 - p.bbox.x1) * sx}%`, height: `${(p.bbox.y2 - p.bbox.y1) * sy}%` }}>
                      <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${sel ? "bg-[#FDB927] text-black" : hov ? "bg-white text-black" : "bg-green-600/80 text-white"}`}>
                        {sel ? `#${idx + 1}` : `ID ${p.track_id}`}
                      </span>
                      {sel && <div className="absolute inset-0 flex items-center justify-center"><CheckCircle2 className="h-7 w-7 text-[#FDB927] drop-shadow-lg" /></div>}
                    </div>
                  )
                })}
              </div>
            ) : null}

            {selectedPlayers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Selected — click name to edit</h4>
                {selectedPlayers.map((sp, idx) => (
                  <div key={sp.track_id} className="flex items-center gap-2 p-2 rounded-lg border border-[#FDB927]/30 bg-[#FDB927]/5">
                    <Badge className="bg-[#FDB927] text-black text-xs shrink-0">#{idx + 1}</Badge>
                    {editingNameId === sp.track_id ? (
                      <input autoFocus type="text" value={sp.name} onChange={(e) => updatePlayerName(sp.track_id, e.target.value)}
                        onBlur={() => setEditingNameId(null)} onKeyDown={(e) => e.key === "Enter" && setEditingNameId(null)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-border bg-background" />
                    ) : (
                      <span onClick={() => setEditingNameId(sp.track_id)} className="flex-1 text-sm font-medium cursor-text hover:text-[#FDB927] transition-colors">{sp.name}</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => togglePlayer(sp.track_id)}><Minus className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setStep("ready")} className="flex-1 bg-[#FDB927] text-black hover:bg-[#FDB927]/90" disabled={selectedPlayers.length === 0}>
                <CheckCircle2 className="mr-2 h-4 w-4" />Confirm {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? "s" : ""}
              </Button>
              <Button onClick={handleReset} variant="outline" size="icon"><X className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* VIDEO PREVIEW */}
        {step !== "select-players" && (
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border">
            {hasVideo ? (
              <>
                <video ref={videoRef} src={videoUrl || undefined} className="w-full h-full object-contain" playsInline muted controls={step === "ready" || step === "results"} />
                {step === "analyzing" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                    <div className="w-full px-6 space-y-3 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#FDB927]" />
                      <p className="text-sm text-white font-medium">Analyzing {selectedPlayers.length} player{selectedPlayers.length !== 1 ? "s" : ""}...</p>
                      <p className="text-xs text-white/60">This may take 1–2 minutes</p>
                    </div>
                  </div>
                )}
                {step === "results" && activeResult?.success && activeResult.risk && (
                  <div className="absolute top-2 right-2 z-10 flex gap-1">
                    {activeResult.risk.serious_injury_flags && (
                      <Badge className="bg-red-600/90 text-white border-red-500 animate-pulse"><AlertOctagon className="h-3 w-3 mr-1" />Injury Alert</Badge>
                    )}
                    <Badge className={getCategoryBadge(activeResult.risk.risk_category).className}>{getCategoryBadge(activeResult.risk.risk_category).label}</Badge>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <Upload className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4 text-center">Upload game footage for injury risk analysis</p>
                <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={!apiOnline}><Upload className="mr-2 h-4 w-4" />Select Video</Button>
                <p className="text-xs text-muted-foreground mt-2">MP4, WebM, MOV — max 200MB</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* READY */}
        {step === "ready" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {selectedPlayers.map((sp, idx) => (
                <Badge key={sp.track_id} variant="outline" className="border-[#FDB927]/50 text-[#FDB927]">#{idx + 1} {sp.name}</Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAnalyze} className="flex-1" disabled={!apiOnline || selectedPlayers.length === 0}>
                <Play className="mr-2 h-4 w-4" />Analyze {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? "s" : ""}
              </Button>
              <Button onClick={() => setStep("select-players")} variant="outline" size="sm"><Users className="mr-1 h-3 w-3" />Edit</Button>
              <Button onClick={handleReset} variant="outline" size="icon"><X className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {step === "results" && playerResults.length > 0 && (
          <div className="space-y-4">
            {playerResults.length > 1 && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                {playerResults.map((r, idx) => {
                  const name = r.player?.name || `Player ${idx + 1}`
                  const risk = r.success && r.risk ? r.risk.overall_risk_score : null
                  const flags = r.risk?.serious_injury_flags
                  return (
                    <button key={idx} onClick={() => { setActiveResultIdx(idx); setShowDetails(false) }}
                      className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${activeResultIdx === idx ? "bg-[#FDB927] text-black" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}>
                      {flags && <AlertOctagon className="h-3 w-3 text-red-500" />}
                      <span>{name}</span>
                      {risk !== null && <span className={`ml-1 text-xs ${activeResultIdx === idx ? "text-black/70" : getRiskColor(risk)}`}>{risk}</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {activeResult && !activeResult.success && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{activeResult.player?.name}: {activeResult.error}</p>
              </div>
            )}

            {activeResult?.success && activeResult.risk && (
              <>
                {/* Serious injury warning banner */}
                {activeResult.risk.serious_injury_flags && (
                  <div className="p-3 rounded-lg bg-red-500/15 border-2 border-red-500/40 flex items-start gap-3">
                    <AlertOctagon className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-400">⚠️ Serious Injury Indicators Detected</p>
                      <p className="text-xs text-red-300/80 mt-1">
                        {activeResult.injury_indicators?.collapse_count ? `${activeResult.injury_indicators.collapse_count} body collapse(s). ` : ""}
                        {activeResult.injury_indicators?.hyperextension_count ? `${activeResult.injury_indicators.hyperextension_count} hyperextension(s). ` : ""}
                        {activeResult.injury_indicators?.stillness_count ? `${activeResult.injury_indicators.stillness_count} post-impact stillness event(s). ` : ""}
                        Recommend immediate medical evaluation.
                      </p>
                    </div>
                  </div>
                )}

                {activeResult.player && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" /><span>{activeResult.player.name}</span><span>•</span><span>{activeResult.player.frames_tracked} frames</span>
                  </div>
                )}

                <div className="p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Injury Risk</span>
                    <span className={`text-3xl font-bold ${getRiskColor(activeResult.risk.overall_risk_score)}`}>
                      {activeResult.risk.overall_risk_score}<span className="text-base font-normal text-muted-foreground">/100</span>
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${getRiskBg(activeResult.risk.overall_risk_score)}`} style={{ width: `${activeResult.risk.overall_risk_score}%` }} />
                  </div>
                  <Badge className={`mt-2 ${getCategoryBadge(activeResult.risk.risk_category).className}`}>{getCategoryBadge(activeResult.risk.risk_category).label}</Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-3">Risk Breakdown</h3>
                  <div className="space-y-2">
                    {activeResult.risk.risk_factors.map((rf: RiskFactor) => {
                      const Icon = riskFactorIcon(rf.factor)
                      const isInjuryFactor = rf.factor === "injury_indicators" && rf.score > 0
                      return (
                        <div key={rf.factor} className={`p-3 rounded-lg border bg-card/50 ${isInjuryFactor ? "border-red-500/40 bg-red-500/5" : "border-border"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${isInjuryFactor ? "text-red-500" : getRiskColor(rf.score)}`} />
                              <span className="text-sm font-medium">{rf.label}</span>
                              <span className="text-xs text-muted-foreground">({rf.weight}%)</span>
                            </div>
                            <span className={`text-sm font-bold ${isInjuryFactor ? "text-red-500" : getRiskColor(rf.score)}`}>{rf.score}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mb-1">
                            <div className={`h-full rounded-full ${isInjuryFactor && rf.score > 0 ? "bg-red-500" : getRiskBg(rf.score)}`} style={{ width: `${rf.score}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground">{rf.details}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {activeResult.events && (
                  <div className={`grid gap-3 ${activeResult.injury_indicators && activeResult.injury_indicators.total_count > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
                    <div className="p-3 rounded-lg border border-border bg-card/50 text-center">
                      <Zap className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                      <div className="text-2xl font-bold">{activeResult.events.jumps.count}</div>
                      <div className="text-xs text-muted-foreground">Jumps</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-card/50 text-center">
                      <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-orange-400" />
                      <div className="text-2xl font-bold">{activeResult.events.contacts.count}</div>
                      <div className="text-xs text-muted-foreground">Contacts</div>
                    </div>
                    {activeResult.injury_indicators && activeResult.injury_indicators.total_count > 0 && (
                      <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-center">
                        <HeartPulse className="h-5 w-5 mx-auto mb-1 text-red-500" />
                        <div className="text-2xl font-bold text-red-500">{activeResult.injury_indicators.total_count}</div>
                        <div className="text-xs text-red-400">Injury Flags</div>
                      </div>
                    )}
                  </div>
                )}

                {activeResult.stats?.velocity && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded border border-border bg-card/50 text-center">
                      <div className="text-lg font-bold text-green-400">{activeResult.stats.velocity.max_velocity.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Max Vel</div>
                    </div>
                    <div className="p-2 rounded border border-border bg-card/50 text-center">
                      <div className="text-lg font-bold text-blue-400">{activeResult.stats.velocity.mean_velocity.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Avg Vel</div>
                    </div>
                    <div className="p-2 rounded border border-border bg-card/50 text-center">
                      <div className="text-lg font-bold text-yellow-400">{activeResult.stats.biomechanics?.avg_knee_angle?.toFixed(0) ?? "—"}°</div>
                      <div className="text-xs text-muted-foreground">Avg Knee</div>
                    </div>
                  </div>
                )}

                <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="w-full">
                  {showDetails ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                  {showDetails ? "Hide" : "Show"} Details
                </Button>

                {showDetails && (
                  <div className="p-3 rounded-lg border border-border bg-card/50 space-y-2 text-sm">
                    {activeResult.stats?.biomechanics && (
                      <>
                        <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Biomechanics</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {Object.entries(activeResult.stats.biomechanics).map(([key, val]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground text-xs">{key.replace(/_/g, " ")}</span>
                              <span className="text-xs font-mono">{typeof val === "number" ? val.toFixed(1) : val}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {activeResult.injury_indicators && activeResult.injury_indicators.events.length > 0 && (
                      <>
                        <h4 className="font-medium text-xs text-red-400 uppercase tracking-wider pt-2">Injury Indicator Events</h4>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {activeResult.injury_indicators.events.map((e, i) => (
                            <div key={i} className="text-xs flex items-center justify-between text-muted-foreground p-1 rounded bg-red-500/5">
                              <span>t={e.timestamp}s — {e.type.replace(/_/g, " ")}</span>
                              <Badge variant="outline" className={`text-[10px] px-1 py-0 ${e.severity === "critical" ? "border-red-500 text-red-400 font-bold" : e.severity === "high" ? "border-red-500 text-red-400" : "border-yellow-500 text-yellow-400"}`}>
                                {e.severity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {activeResult.events && activeResult.events.contacts.events.length > 0 && (
                      <>
                        <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider pt-2">Contact Events</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {activeResult.events.contacts.events.map((c, i) => (
                            <div key={i} className="text-xs flex justify-between text-muted-foreground">
                              <span>t={c.timestamp}s — decel: {c.deceleration.toFixed(1)}</span>
                              <Badge variant="outline" className={`text-[10px] px-1 py-0 ${c.severity === "high" ? "border-red-500 text-red-400" : c.severity === "medium" ? "border-yellow-500 text-yellow-400" : "border-green-500 text-green-400"}`}>{c.severity}</Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <Button onClick={handleReset} variant="outline" className="w-full">Analyze Another Video</Button>
              </>
            )}
          </div>
        )}

        {/* HISTORY */}
        <div className="border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="w-full justify-between">
            <span className="flex items-center gap-2"><History className="h-4 w-4" />Analysis History ({history.length})</span>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showHistory && (
            <div className="mt-2 space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No analysis history yet</p>
              ) : (
                <>
                  {history.map((entry) => (
                    <div key={entry.id} className="p-3 rounded-lg border border-border bg-card/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate max-w-[60%]">{entry.videoName}</span>
                        <span className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {entry.players.map((p, i) => (
                          <Badge key={i} variant="outline" className={`text-[10px] ${p.seriousFlags ? "border-red-500 text-red-400" : getRiskColor(p.riskScore).replace("text-", "border-").replace("500", "500/50") + " " + getRiskColor(p.riskScore)}`}>
                            {p.seriousFlags && <AlertOctagon className="h-2 w-2 mr-0.5" />}
                            {p.name}: {p.riskScore}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button onClick={handleClearHistory} variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-3 w-3" />Clear History
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
