export interface MovementMetrics {
  jumpCount: number
  accelerationBursts: number
  movementIntensityScore: number
  contactProxyScore: number
  gameLoadStressScore: number
  landingMechanicsScore: number
  movementAsymmetryScore: number
  fatigueIndicatorScore: number
  overallInjuryRisk: number
}

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface AnalysisFrame {
  timestamp: number
  landmarks: PoseLandmark[]
  velocity?: { x: number; y: number }
  acceleration?: { x: number; y: number }
}

class VideoAnalyzer {
  private frames: AnalysisFrame[] = []
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private isAnalyzing = false
  private animationFrameId: number | null = null
  private pose: any = null
  private camera: any = null
  private drawConnectors: any = null
  private drawLandmarks: any = null
  private POSE_CONNECTIONS: any = null
  private onProgress?: (progress: number) => void
  private onComplete?: (metrics: MovementMetrics) => void

  async initializePose() {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error("MediaPipe can only be used in browser environment")
      }

      // Dynamically import MediaPipe Pose - use dynamic import to avoid SSR issues
      // Use string concatenation to prevent webpack from statically analyzing the import
      const mediapipePosePath = "@mediapipe/" + "pose"
      const mediapipeCameraPath = "@mediapipe/" + "camera_utils"
      const mediapipeDrawingPath = "@mediapipe/" + "drawing_utils"
      
      let poseModule, cameraModule, drawingModule
      
      try {
        // Dynamic imports that webpack can't statically analyze
        poseModule = await import(/* webpackIgnore: true */ mediapipePosePath)
        cameraModule = await import(/* webpackIgnore: true */ mediapipeCameraPath)
        drawingModule = await import(/* webpackIgnore: true */ mediapipeDrawingPath)
      } catch (importError: any) {
        const errorMsg = importError?.message || String(importError)
        throw new Error(
          `MediaPipe packages are not installed or failed to load: ${errorMsg}. Please run: npm install @mediapipe/pose @mediapipe/camera_utils @mediapipe/drawing_utils`
        )
      }

      const { Pose, POSE_CONNECTIONS } = poseModule
      const { Camera } = cameraModule
      const { drawConnectors, drawLandmarks } = drawingModule

      if (!Pose || !Camera || !drawConnectors || !drawLandmarks || !POSE_CONNECTIONS) {
        throw new Error("MediaPipe modules are missing required exports")
      }

      this.drawConnectors = drawConnectors
      this.drawLandmarks = drawLandmarks
      this.POSE_CONNECTIONS = POSE_CONNECTIONS

      this.pose = new Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        },
      })

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      this.pose.onResults((results: any) => {
        if (results.poseLandmarks && this.ctx && this.canvasElement && this.videoElement) {
          this.drawPose(results.poseLandmarks)
          this.processFrame(results.poseLandmarks)
        }
      })

      return { Camera }
    } catch (error) {
      console.error("Failed to initialize MediaPipe:", error)
      throw error
    }
  }

  private drawPose(landmarks: any[]) {
    if (!this.ctx || !this.canvasElement || !this.videoElement || !this.drawConnectors || !this.drawLandmarks || !this.POSE_CONNECTIONS) return

    this.ctx.save()
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)
    
    // Draw video frame
    this.ctx.drawImage(
      this.videoElement,
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    )

    // Scale landmarks to canvas size
    const scaledLandmarks = landmarks.map((lm: any) => ({
      x: lm.x * this.canvasElement!.width,
      y: lm.y * this.canvasElement!.height,
      z: lm.z,
      visibility: lm.visibility,
    }))

    // Draw pose connections and landmarks
    this.drawConnectors(this.ctx, scaledLandmarks, this.POSE_CONNECTIONS, {
      color: "#00FF00",
      lineWidth: 2,
    })
    this.drawLandmarks(this.ctx, scaledLandmarks, {
      color: "#FF0000",
      lineWidth: 1,
      radius: 3,
    })

    this.ctx.restore()
  }

  private processFrame(landmarks: any[]) {
    const frame: AnalysisFrame = {
      timestamp: this.videoElement?.currentTime || 0,
      landmarks: landmarks.map((lm: any) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility,
      })),
    }

    // Calculate velocity and acceleration
    if (this.frames.length > 0) {
      const prevFrame = this.frames[this.frames.length - 1]
      const timeDelta = frame.timestamp - prevFrame.timestamp

      if (timeDelta > 0 && landmarks.length >= 28) {
        // Calculate center of mass (average of hip landmarks)
        const hipLeft = landmarks[23] // Left hip
        const hipRight = landmarks[24] // Right hip
        const centerX = (hipLeft.x + hipRight.x) / 2
        const centerY = (hipLeft.y + hipRight.y) / 2

        const prevHipLeft = prevFrame.landmarks[23]
        const prevHipRight = prevFrame.landmarks[24]
        const prevCenterX = (prevHipLeft.x + prevHipRight.x) / 2
        const prevCenterY = (prevHipLeft.y + prevHipRight.y) / 2

        frame.velocity = {
          x: (centerX - prevCenterX) / timeDelta,
          y: (centerY - prevCenterY) / timeDelta,
        }

        if (prevFrame.velocity) {
          frame.acceleration = {
            x: (frame.velocity.x - prevFrame.velocity.x) / timeDelta,
            y: (frame.velocity.y - prevFrame.velocity.y) / timeDelta,
          }
        }
      }
    }

    this.frames.push(frame)
  }

  async analyzeVideo(
    videoFile: File,
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    onProgress?: (progress: number) => void,
    onComplete?: (metrics: MovementMetrics) => void
  ): Promise<MovementMetrics> {
    this.canvasElement = canvas
    this.videoElement = video
    this.ctx = canvas.getContext("2d")
    this.frames = []
    this.onProgress = onProgress
    this.onComplete = onComplete
    this.isAnalyzing = true

    try {
      const mediaPipeLibs = await this.initializePose()
      const { Camera } = mediaPipeLibs

      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(videoFile)
        video.src = url

        let progressInterval: NodeJS.Timeout | null = null

        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          this.camera = new Camera(video, {
            onFrame: async () => {
              if (this.isAnalyzing && this.pose) {
                try {
                  await this.pose.send({ image: video })
                } catch (err) {
                  console.error("Error processing frame:", err)
                }
              }
            },
            width: video.videoWidth,
            height: video.videoHeight,
          })

          this.camera.start().catch((err: Error) => {
            console.error("Camera start error:", err)
            reject(new Error("Failed to start camera: " + err.message))
            URL.revokeObjectURL(url)
          })

          // Monitor progress
          progressInterval = setInterval(() => {
            if (video.ended || !this.isAnalyzing) {
              if (progressInterval) clearInterval(progressInterval)
              if (this.camera) {
                try {
                  this.camera.stop()
                } catch (e) {
                  console.error("Error stopping camera:", e)
                }
              }
              const metrics = this.calculateMetrics()
              this.isAnalyzing = false
              if (this.onComplete) {
                this.onComplete(metrics)
              }
              resolve(metrics)
              URL.revokeObjectURL(url)
            } else {
              const progress = (video.currentTime / video.duration) * 100
              if (this.onProgress) {
                this.onProgress(progress)
              }
            }
          }, 100)

          video.onerror = () => {
            if (progressInterval) clearInterval(progressInterval)
            if (this.camera) {
              try {
                this.camera.stop()
              } catch (e) {
                console.error("Error stopping camera:", e)
              }
            }
            this.isAnalyzing = false
            reject(new Error("Video playback error"))
            URL.revokeObjectURL(url)
          }

          video.play().catch((err) => {
            if (progressInterval) clearInterval(progressInterval)
            if (this.camera) {
              try {
                this.camera.stop()
              } catch (e) {
                console.error("Error stopping camera:", e)
              }
            }
            this.isAnalyzing = false
            reject(new Error("Video play error: " + err.message))
            URL.revokeObjectURL(url)
          })
        }

        video.onerror = () => {
          reject(new Error("Failed to load video"))
          URL.revokeObjectURL(url)
        }
      })
    } catch (error) {
      this.isAnalyzing = false
      throw error
    }
  }

  private calculateMetrics(): MovementMetrics {
    if (this.frames.length === 0) {
      return this.getDefaultMetrics()
    }

    // Calculate jump count (detect vertical velocity spikes)
    const jumpCount = this.detectJumps()

    // Calculate acceleration bursts
    const accelerationBursts = this.detectAccelerationBursts()

    // Calculate movement intensity
    const movementIntensityScore = this.calculateMovementIntensity()

    // Calculate contact proxy (based on proximity to other players/ground)
    const contactProxyScore = this.calculateContactProxy()

    // Calculate landing mechanics quality
    const landingMechanicsScore = this.calculateLandingMechanics()

    // Calculate movement asymmetry
    const movementAsymmetryScore = this.calculateMovementAsymmetry()

    // Calculate fatigue indicators
    const fatigueIndicatorScore = this.calculateFatigueIndicators()

    // Calculate game load stress
    const gameLoadStressScore = Math.round(
      (movementIntensityScore * 0.4 +
        contactProxyScore * 0.3 +
        fatigueIndicatorScore * 0.3)
    )

    // Overall injury risk (0-100, higher = more risk)
    // Lower scores in mechanics/asymmetry/fatigue = higher risk
    const overallInjuryRisk = Math.round(
      100 -
        (landingMechanicsScore * 0.3 +
          (100 - movementAsymmetryScore) * 0.2 +
          (100 - fatigueIndicatorScore) * 0.2 +
          (100 - contactProxyScore) * 0.15 +
          (100 - movementIntensityScore / 2) * 0.15)
    )

    return {
      jumpCount,
      accelerationBursts,
      movementIntensityScore: Math.round(movementIntensityScore),
      contactProxyScore: Math.round(contactProxyScore),
      gameLoadStressScore,
      landingMechanicsScore: Math.round(landingMechanicsScore),
      movementAsymmetryScore: Math.round(movementAsymmetryScore),
      fatigueIndicatorScore: Math.round(fatigueIndicatorScore),
      overallInjuryRisk: Math.max(0, Math.min(100, overallInjuryRisk)),
    }
  }

  private detectJumps(): number {
    let jumpCount = 0
    const threshold = 0.05 // Vertical velocity threshold

    for (let i = 1; i < this.frames.length; i++) {
      const frame = this.frames[i]
      const prevFrame = this.frames[i - 1]

      if (frame.velocity && prevFrame.velocity) {
        // Detect upward velocity spike followed by downward
        if (
          frame.velocity.y < -threshold &&
          prevFrame.velocity.y >= -threshold
        ) {
          jumpCount++
        }
      }
    }

    return jumpCount
  }

  private detectAccelerationBursts(): number {
    let burstCount = 0
    const threshold = 0.1 // Acceleration threshold

    for (const frame of this.frames) {
      if (frame.acceleration) {
        const accelMagnitude = Math.sqrt(
          frame.acceleration.x ** 2 + frame.acceleration.y ** 2
        )
        if (accelMagnitude > threshold) {
          burstCount++
        }
      }
    }

    return Math.round(burstCount / 10) // Normalize
  }

  private calculateMovementIntensity(): number {
    let totalIntensity = 0
    let count = 0

    for (const frame of this.frames) {
      if (frame.velocity) {
        const velocityMagnitude = Math.sqrt(
          frame.velocity.x ** 2 + frame.velocity.y ** 2
        )
        totalIntensity += velocityMagnitude * 1000 // Scale up
        count++
      }
    }

    return count > 0 ? Math.min(100, totalIntensity / count) : 50
  }

  private calculateContactProxy(): number {
    // Simulate contact based on movement patterns and proximity to ground
    let contactScore = 0
    let count = 0

    for (const frame of this.frames) {
      if (frame.landmarks.length >= 28) {
        // Use ankle landmarks (feet) proximity to ground
        const leftAnkle = frame.landmarks[27] // Left ankle
        const rightAnkle = frame.landmarks[28] // Right ankle

        // Higher Y value = closer to bottom = more contact
        const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2
        const contact = (1 - avgAnkleY) * 100 // Invert Y (0 = top, 1 = bottom)

        contactScore += contact
        count++
      }
    }

    return count > 0 ? Math.min(100, contactScore / count) : 50
  }

  private calculateLandingMechanics(): number {
    // Analyze landing quality based on knee angles and symmetry
    let mechanicsScore = 100
    let landingFrames = 0

    for (let i = 1; i < this.frames.length; i++) {
      const frame = this.frames[i]
      const prevFrame = this.frames[i - 1]

      // Detect landing (downward velocity to zero)
      if (
        frame.velocity &&
        prevFrame.velocity &&
        prevFrame.velocity.y > 0.02 &&
        frame.velocity.y <= 0.02 &&
        frame.landmarks.length >= 28
      ) {
        landingFrames++

        // Calculate knee angles
        const leftKneeAngle = this.calculateKneeAngle(
          frame.landmarks[23], // Left hip
          frame.landmarks[25], // Left knee
          frame.landmarks[27] // Left ankle
        )

        const rightKneeAngle = this.calculateKneeAngle(
          frame.landmarks[24], // Right hip
          frame.landmarks[26], // Right knee
          frame.landmarks[28] // Right ankle
        )

        // Penalize poor landing mechanics
        // Ideal knee angle on landing: ~140-160 degrees
        const idealAngle = 150
        const leftDeviation = Math.abs(leftKneeAngle - idealAngle)
        const rightDeviation = Math.abs(rightKneeAngle - idealAngle)

        // Penalize asymmetry
        const asymmetry = Math.abs(leftKneeAngle - rightKneeAngle)

        mechanicsScore -= (leftDeviation + rightDeviation) / 10
        mechanicsScore -= asymmetry * 2
      }
    }

    return Math.max(0, Math.min(100, mechanicsScore))
  }

  private calculateKneeAngle(
    hip: PoseLandmark,
    knee: PoseLandmark,
    ankle: PoseLandmark
  ): number {
    // Calculate angle at knee joint
    const vec1 = { x: hip.x - knee.x, y: hip.y - knee.y }
    const vec2 = { x: ankle.x - knee.x, y: ankle.y - knee.y }

    const dot = vec1.x * vec2.x + vec1.y * vec2.y
    const mag1 = Math.sqrt(vec1.x ** 2 + vec1.y ** 2)
    const mag2 = Math.sqrt(vec2.x ** 2 + vec2.y ** 2)

    if (mag1 === 0 || mag2 === 0) return 180

    const cosAngle = dot / (mag1 * mag2)
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)))

    return (angle * 180) / Math.PI
  }

  private calculateMovementAsymmetry(): number {
    // Compare left vs right side movement patterns
    let asymmetryScore = 100

    for (const frame of this.frames) {
      if (frame.landmarks.length >= 28) {
        // Compare left and right side key points
        const leftShoulder = frame.landmarks[11]
        const rightShoulder = frame.landmarks[12]
        const leftHip = frame.landmarks[23]
        const rightHip = frame.landmarks[24]
        const leftKnee = frame.landmarks[25]
        const rightKnee = frame.landmarks[26]

        // Calculate asymmetry in shoulder height
        const shoulderAsymmetry = Math.abs(leftShoulder.y - rightShoulder.y) * 1000
        const hipAsymmetry = Math.abs(leftHip.y - rightHip.y) * 1000
        const kneeAsymmetry = Math.abs(leftKnee.y - rightKnee.y) * 1000

        asymmetryScore -= (shoulderAsymmetry + hipAsymmetry + kneeAsymmetry) / 3
      }
    }

    return Math.max(0, Math.min(100, asymmetryScore / Math.max(1, this.frames.length)))
  }

  private calculateFatigueIndicators(): number {
    // Analyze movement degradation over time
    if (this.frames.length < 10) return 50

    const firstThird = Math.floor(this.frames.length / 3)
    const lastThird = this.frames.length - Math.floor(this.frames.length / 3)

    let earlyIntensity = 0
    let lateIntensity = 0
    let earlyCount = 0
    let lateCount = 0

    for (let i = 0; i < firstThird; i++) {
      if (this.frames[i].velocity) {
        earlyIntensity += Math.sqrt(
          this.frames[i].velocity.x ** 2 + this.frames[i].velocity.y ** 2
        )
        earlyCount++
      }
    }

    for (let i = lastThird; i < this.frames.length; i++) {
      if (this.frames[i].velocity) {
        lateIntensity += Math.sqrt(
          this.frames[i].velocity.x ** 2 + this.frames[i].velocity.y ** 2
        )
        lateCount++
      }
    }

    if (earlyCount === 0 || lateCount === 0) return 50

    const earlyAvg = earlyIntensity / earlyCount
    const lateAvg = lateIntensity / lateCount

    if (earlyAvg === 0) return 50

    // Fatigue = reduction in movement intensity
    const fatigueReduction = ((earlyAvg - lateAvg) / earlyAvg) * 100

    return Math.max(0, Math.min(100, 100 - fatigueReduction))
  }

  private getDefaultMetrics(): MovementMetrics {
    return {
      jumpCount: 0,
      accelerationBursts: 0,
      movementIntensityScore: 0,
      contactProxyScore: 0,
      gameLoadStressScore: 0,
      landingMechanicsScore: 0,
      movementAsymmetryScore: 0,
      fatigueIndicatorScore: 0,
      overallInjuryRisk: 50,
    }
  }

  stop() {
    this.isAnalyzing = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    if (this.camera) {
      try {
        this.camera.stop()
      } catch (e) {
        console.error("Error stopping camera:", e)
      }
      this.camera = null
    }
    if (this.videoElement) {
      this.videoElement.pause()
    }
  }
}

export const videoAnalyzer = new VideoAnalyzer()
