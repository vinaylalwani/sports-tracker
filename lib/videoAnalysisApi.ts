const API_BASE = process.env.NEXT_PUBLIC_VISION_API_URL || "http://localhost:5050";

// ---------- Types ----------

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
  serious_injury_flags?: boolean;
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

export interface InjuryIndicatorEvent {
  frame_seq_idx: number;
  timestamp: number;
  severity: "moderate" | "high" | "critical";
  type: "collapse" | "hyperextension" | "post_impact_stillness";
  [key: string]: unknown;
}

export interface InjuryIndicators {
  total_count: number;
  critical_count: number;
  high_count: number;
  collapse_count: number;
  hyperextension_count: number;
  stillness_count: number;
  has_serious_flags: boolean;
  events: InjuryIndicatorEvent[];
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
  injury_indicators?: InjuryIndicators;
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
  frame_image?: string;
  frame_size?: { width: number; height: number };
}

export interface TrackingFramePlayer {
  track_id: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  /** True when this player was matched to a selected player at the reference frame */
  is_selected?: boolean;
}

export interface TrackingResult {
  success: boolean;
  error?: string;
  fps?: number;
  frame_size?: { width: number; height: number };
  total_frames?: number;
  frames?: { frame_index: number; players: TrackingFramePlayer[] }[];
}

export interface SelectedPlayer {
  track_id: number;
  name: string;
}

// ---------- Analysis History ----------

export interface AnalysisHistoryEntry {
  id: string;
  timestamp: string;
  videoName: string;
  players: {
    name: string;
    riskScore: number;
    riskCategory: string;
    seriousFlags: boolean;
    jumpCount: number;
    contactCount: number;
    injuryIndicatorCount: number;
  }[];
}

const HISTORY_KEY = "sports-tracker-analysis-history";
const MAX_HISTORY = 50;

export function getAnalysisHistory(): AnalysisHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAnalysisToHistory(
  videoName: string,
  results: AnalysisResult[]
): AnalysisHistoryEntry {
  const entry: AnalysisHistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    videoName,
    players: results
      .filter((r) => r.success && r.risk)
      .map((r) => ({
        name: r.player?.name || "Unknown",
        riskScore: r.risk!.overall_risk_score,
        riskCategory: r.risk!.risk_category,
        seriousFlags: r.risk!.serious_injury_flags || false,
        jumpCount: r.events?.jumps.count || 0,
        contactCount: r.events?.contacts.count || 0,
        injuryIndicatorCount: r.injury_indicators?.total_count || 0,
      })),
  };

  const history = getAnalysisHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // localStorage full — remove oldest
    history.length = Math.floor(MAX_HISTORY / 2);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  return entry;
}

export function clearAnalysisHistory(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(HISTORY_KEY);
  }
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
  if (options.playerName) formData.append("player_name", options.playerName);
  if (options.trackId !== undefined) formData.append("track_id", String(options.trackId));

  const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: formData });
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

  const res = await fetch(`${API_BASE}/api/analyze/multi`, { method: "POST", body: formData });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `API error: ${res.status}`);
  }
  return res.json();
}

export async function detectPlayers(file: File, frameIdx = 30): Promise<PlayerDetectionResult> {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("frame_idx", String(frameIdx));

  const res = await fetch(`${API_BASE}/api/analyze/detect-players`, { method: "POST", body: formData });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `API error: ${res.status}`);
  }
  return res.json();
}

export interface ReferenceSelection {
  track_id: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

export async function getTrackingData(
  file: File,
  frameSkip = 2,
  options?: { referenceFrameIndex?: number; referenceSelections?: ReferenceSelection[] }
): Promise<TrackingResult> {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("frame_skip", String(frameSkip));
  if (options?.referenceFrameIndex != null) {
    formData.append("reference_frame_index", String(options.referenceFrameIndex));
  }
  if (options?.referenceSelections?.length) {
    formData.append("reference_selections", JSON.stringify(options.referenceSelections));
  }

  const res = await fetch(`${API_BASE}/api/analyze/tracking`, { method: "POST", body: formData });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `API error: ${res.status}`);
  }
  return res.json();
}
