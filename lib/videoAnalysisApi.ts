const API_BASE = process.env.NEXT_PUBLIC_VISION_API_URL || "http://localhost:5050";

// ---------- Types matching Python pipeline output ----------

export interface RiskFactor {
  factor: string;
  label: string;
  score: number;
  weight: number;
  details: string;
}

export interface RiskAssessment {
  overall_risk_score: number;
  risk_category: "minimal" | "low" | "moderate" | "high";
  risk_factors: RiskFactor[];
}

export interface JumpEvent {
  frame_seq_idx: number;
  timestamp: number;
  jump_height_norm: number;
  landing_seq_idx: number;
  landing_timestamp: number;
}

export interface ContactEvent {
  frame_seq_idx: number;
  timestamp: number;
  deceleration: number;
  jerk: number;
  severity: "low" | "medium" | "high";
}

export interface BiomechanicsFrame {
  timestamp: number;
  left_knee_angle: number;
  right_knee_angle: number;
  left_hip_angle: number;
  right_hip_angle: number;
  trunk_lean: number;
  knee_symmetry_diff: number;
}

export interface VelocityFrame {
  timestamp: number;
  velocity: number;
}

export interface GroundContactFrame {
  timestamp: number;
  on_ground: boolean;
  ankle_y: number;
}

export interface PlayerInfo {
  name: string;
  track_id: number;
  frames_tracked: number;
}

export interface DetectedPlayer {
  track_id: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  center: { x: number; y: number };
}

export interface AnalysisResult {
  success: boolean;
  error?: string;
  frames_detected?: number;
  video_info?: {
    path: string;
    fps: number;
    duration_seconds: number;
    frames_analyzed: number;
    total_frames: number;
  };
  risk?: RiskAssessment;
  events?: {
    jumps: { count: number; events: JumpEvent[] };
    contacts: { count: number; events: ContactEvent[] };
  };
  graphs?: {
    biomechanics_timeline: BiomechanicsFrame[];
    velocity_timeline: VelocityFrame[];
    ground_contact_timeline: GroundContactFrame[];
  };
  stats?: {
    biomechanics: Record<string, number>;
    velocity: { max_velocity: number; mean_velocity: number; std_velocity: number };
  };
  player?: PlayerInfo;
}

export interface MultiPlayerResult {
  success: boolean;
  error?: string;
  results?: AnalysisResult[];
}

export interface PlayerDetectionResult {
  success: boolean;
  error?: string;
  players?: DetectedPlayer[];
  frame_image?: string; // base64 data URI
  frame_size?: { width: number; height: number };
}

export interface SelectedPlayer {
  track_id: number;
  name: string;
}

// ---------- API Functions ----------

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function analyzeVideo(
  file: File,
  options: {
    mode?: "single" | "player";
    playerName?: string;
    frameSkip?: number;
    trackId?: number;
  } = {}
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("mode", options.mode || "single");
  formData.append("frame_skip", String(options.frameSkip ?? 2));

  if (options.playerName) {
    formData.append("player_name", options.playerName);
  }
  if (options.trackId !== undefined) {
    formData.append("track_id", String(options.trackId));
  }

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `API error: ${res.status}`);
  }

  return res.json();
}

export async function analyzeMultiPlayers(
  file: File,
  players: SelectedPlayer[],
  frameSkip = 2
): Promise<MultiPlayerResult> {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("players", JSON.stringify(players));
  formData.append("frame_skip", String(frameSkip));

  const res = await fetch(`${API_BASE}/api/analyze/multi`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `API error: ${res.status}`);
  }

  return res.json();
}

export async function detectPlayers(
  file: File,
  frameIdx = 30
): Promise<PlayerDetectionResult> {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("frame_idx", String(frameIdx));

  const res = await fetch(`${API_BASE}/api/analyze/detect-players`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `API error: ${res.status}`);
  }

  return res.json();
}
