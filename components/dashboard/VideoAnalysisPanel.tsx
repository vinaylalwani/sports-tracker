"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
} from "lucide-react"
import { videoAnalyzer, MovementMetrics } from "@/lib/videoAnalysis"

export function VideoAnalysisPanel() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hasVideo, setHasVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<MovementMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      // Cleanup
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      videoAnalyzer.stop()
    }
  }, [videoUrl])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("video/")) {
      setError("Please select a video file")
      return
    }

    // Check file size (limit to 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      setError("Video file is too large. Please select a file under 100MB.")
      return
    }

    setError(null)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setHasVideo(true)
    setAnalysisResults(null)
    setProgress(0)

    if (videoRef.current) {
      videoRef.current.src = url
      videoRef.current.load()
      
      // Wait for video to be ready
      videoRef.current.onloadedmetadata = () => {
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth
          canvasRef.current.height = videoRef.current.videoHeight
        }
      }
    }
  }

  const handleAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !videoUrl) return

    setIsAnalyzing(true)
    setProgress(0)
    setError(null)

    try {
      const fileInput = fileInputRef.current?.files?.[0]
      if (!fileInput) {
        throw new Error("No video file selected")
      }

      const metrics = await videoAnalyzer.analyzeVideo(
        fileInput,
        canvasRef.current,
        videoRef.current,
        (prog) => {
          setProgress(prog)
        },
        (results) => {
          setAnalysisResults(results)
          setIsAnalyzing(false)
        }
      )

      setAnalysisResults(metrics)
      setIsAnalyzing(false)
    } catch (err) {
      console.error("Video analysis error:", err)
      const errorMessage = err instanceof Error ? err.message : "Analysis failed"
      setError(errorMessage + ". Please ensure MediaPipe libraries are loaded and try again.")
      setIsAnalyzing(false)
      setProgress(0)
    }
  }

  const handleReset = () => {
    videoAnalyzer.stop()
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
    setVideoUrl(null)
    setHasVideo(false)
    setAnalysisResults(null)
    setProgress(0)
    setIsAnalyzing(false)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const metrics = analysisResults
    ? [
        {
          label: "Jump Count",
          value: analysisResults.jumpCount,
          icon: Zap,
          color: "text-blue-400",
        },
        {
          label: "Acceleration Bursts",
          value: analysisResults.accelerationBursts,
          icon: Activity,
          color: "text-green-400",
        },
        {
          label: "Movement Intensity Score",
          value: analysisResults.movementIntensityScore,
          icon: TrendingUp,
          color: "text-yellow-400",
        },
        {
          label: "Contact Proxy Score",
          value: analysisResults.contactProxyScore,
          icon: Shield,
          color: "text-orange-400",
        },
        {
          label: "Game Load Stress Score",
          value: analysisResults.gameLoadStressScore,
          icon: BarChart3,
          color: "text-red-400",
        },
        {
          label: "Landing Mechanics Score",
          value: analysisResults.landingMechanicsScore,
          icon: Shield,
          color: "text-purple-400",
        },
        {
          label: "Movement Asymmetry Score",
          value: analysisResults.movementAsymmetryScore,
          icon: Activity,
          color: "text-cyan-400",
        },
        {
          label: "Fatigue Indicator Score",
          value: analysisResults.fatigueIndicatorScore,
          icon: TrendingUp,
          color: "text-pink-400",
        },
      ]
    : []

  const getInjuryRiskBadge = (risk: number) => {
    if (risk < 30) return { variant: "success" as const, label: "Low Risk" }
    if (risk < 60) return { variant: "warning" as const, label: "Moderate Risk" }
    return { variant: "danger" as const, label: "High Risk" }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-[#FDB927]" />
          Video Analysis Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="space-y-4">
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border">
            {hasVideo ? (
              <>
                <video
                  ref={videoRef}
                  className={`w-full h-full object-contain ${isAnalyzing ? 'hidden' : ''}`}
                  playsInline
                  muted
                  controls={!isAnalyzing}
                />
                <canvas
                  ref={canvasRef}
                  className={`w-full h-full object-contain ${isAnalyzing ? '' : 'hidden'}`}
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                    <div className="w-full px-4 space-y-2">
                      <p className="text-sm text-center text-white">
                        Analyzing movement patterns...
                      </p>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-center text-white/80">
                        {Math.round(progress)}% complete
                      </p>
                    </div>
                  </div>
                )}
                {!isAnalyzing && analysisResults && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge
                      variant={getInjuryRiskBadge(analysisResults.overallInjuryRisk).variant}
                    >
                      {getInjuryRiskBadge(analysisResults.overallInjuryRisk).label}
                    </Badge>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <Upload className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Upload basketball game video for movement analysis
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select Video
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Supports MP4, WebM, MOV formats
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {hasVideo && !isAnalyzing && (
            <div className="flex gap-2">
              {!analysisResults && (
                <Button onClick={handleAnalyze} className="flex-1">
                  <Play className="mr-2 h-4 w-4" />
                  Start Analysis
                </Button>
              )}
              <Button onClick={handleReset} variant="outline">
                <X className="mr-2 h-4 w-4" />
                {analysisResults ? "Reset" : "Remove"}
              </Button>
            </div>
          )}

          {hasVideo && analysisResults && (
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Injury Risk</span>
                <span className="text-2xl font-bold text-[#FDB927]">
                  {analysisResults.overallInjuryRisk}%
                </span>
              </div>
              <Progress
                value={analysisResults.overallInjuryRisk}
                className="h-2 mt-2"
              />
              <Badge
                variant={getInjuryRiskBadge(analysisResults.overallInjuryRisk).variant}
                className="mt-2"
              >
                {getInjuryRiskBadge(analysisResults.overallInjuryRisk).label}
              </Badge>
              <Button onClick={handleReset} variant="outline" className="w-full mt-4">
                Analyze Another Video
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg mb-4">Movement Analysis Metrics</h3>
          {metrics.length > 0 ? (
            metrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <div
                  key={metric.label}
                  className="p-4 rounded-lg border border-border bg-card/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${metric.color}`} />
                      <span className="text-sm font-medium">{metric.label}</span>
                    </div>
                    <span className="text-lg font-bold">{metric.value}</span>
                  </div>
                  <Progress value={metric.value} className="h-1.5" />
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Upload and analyze a video to see movement metrics
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
