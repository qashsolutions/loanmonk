// ============================================================
// CreditMind Core Type Definitions
// ============================================================

// --- OCEAN Trait Types ---

export type OceanTrait = 'O' | 'C' | 'E' | 'A' | 'N';

export interface OceanScores {
  O: number; // Openness (1-5)
  C: number; // Conscientiousness (1-5)
  E: number; // Extraversion (1-5)
  A: number; // Agreeableness (1-5)
  N: number; // Neuroticism (1-5)
}

export interface NormalizedOceanScores {
  O: number; // 0-1
  C: number;
  E: number;
  A: number;
  N: number;
}

export interface TraitVariances {
  O: number;
  C: number;
  E: number;
  A: number;
  N: number;
}

// --- Question Types ---

export type QuestionType = 'grid' | 'bars' | 'budget' | 'timeline' | 'reaction' | 'tradeoff';

export interface QuestionOption {
  visual_hint: string;
  label: string;
  score: number;
  trait: OceanTrait;
}

export interface GeneratedQuestion {
  question_id: string;
  question_type: QuestionType;
  trait: OceanTrait;
  visual_description: string;
  text_clue: string;
  scenario_theme: string;
  options: QuestionOption[];
}

export interface QuestionBatch {
  questions: GeneratedQuestion[];
  selected_index: number;
  session_context: {
    traits_measured: Partial<Record<OceanTrait, number[]>>;
    trait_variances: TraitVariances;
    question_count: number;
  };
}

// --- Response Types ---

export interface QuestionResponse {
  session_id: string;
  question_index: number;
  question_type: QuestionType;
  trait: OceanTrait;
  score: number;
  response_time_ms: number;
  raw_response: Record<string, unknown>;
  hesitation_count: number;
  changed_answer: boolean;
}

// --- Session Types ---

export interface Session {
  id: string;
  user_id: string;
  session_seed: string;
  started_at: string;
  completed_at: string | null;
  duration_sec: number | null;
  device_info: DeviceInfo;
  ip_hash: string | null;
  status: SessionStatus;
  question_count: number;
  current_trait_variances: TraitVariances;
  previous_scenarios: string[];
  target_industry: string;
}

export type SessionStatus = 'in_progress' | 'phase1_complete' | 'phase2_complete' | 'completed' | 'abandoned';

export interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  touchSupported: boolean;
  platform: string;
}

// --- Behavioral Game Types (Phase 2) ---

export interface BehavioralConfig {
  game_seed: string;
  duration_ms: number;
  map_width: number;
  map_height: number;
  customer_count: number;
  event_schedule: ScheduledEvent[];
  cargo_risk_curve: number[];
}

export interface ScheduledEvent {
  type: 'thief' | 'helper' | 'premium_customer' | 'shortcut';
  trigger_time_ms: number;
  position: { x: number; y: number };
  params: Record<string, unknown>;
}

export interface CargoLoad {
  crates: number;
  tipped: boolean;
  reward: number;
  delivery_id: number;
}

export interface BankingEvent {
  timestamp_ms: number;
  amount: number;
  balance_before: number;
}

export interface PathRecord {
  actual_dist: number;
  optimal_dist: number;
  delivery_id: number;
}

export interface LossEvent {
  type: 'theft' | 'tip_over' | 'penalty';
  timestamp_ms: number;
  amount_lost: number;
  behavior_delta: number;
}

export interface SharingEvent {
  offered: boolean;
  accepted: boolean;
  reward_split: number;
}

export interface BehavioralSignals {
  id: string;
  session_id: string;
  game_seed: string;
  duration_ms: number;
  tap_velocities: number[];
  path_records: PathRecord[];
  banking_events: BankingEvent[];
  cargo_loads: CargoLoad[];
  loss_events: LossEvent[];
  sharing_events: SharingEvent[];
  exploration_tiles: number;
  total_tiles: number;
  crowd_time_ms: number;
  quiet_time_ms: number;
  multi_order_counts: number[];
  behavioral_scores: NormalizedOceanScores;
  bart_score: number;
}

// --- Assessment Types ---

export interface Assessment {
  id: string;
  session_id: string;
  trait_scores: OceanScores;
  weighted_risk: number;
  pd_score: number;
  phase2_signal_id: string | null;
  blended_trait_scores: OceanScores;
  consistency_index: ConsistencyIndex;
  pd_phase1_only: number;
  pd_blended: number;
  pd_modified: number;
  risk_rating: RiskRating;
  money_profile: string;
  money_profile_modifier: number;
  gini_contribution: number;
  behavioral_signals: Record<string, unknown>;
  decision: AssessmentDecision;
  created_at: string;
}

export type RiskRating = 'low' | 'moderate' | 'elevated';
export type AssessmentDecision = 'approved' | 'pending_approval' | 'declined' | 'manual_review' | 'pending';

export interface ConsistencyIndex {
  C: number;
  N: number;
  A: number;
  O: number;
  E: number;
  overall: number;
  flag: ConsistencyFlag;
}

export type ConsistencyFlag = 'highly_consistent' | 'normal_variance' | 'moderate_discrepancy' | 'high_discrepancy';

// --- Loan Recommendation Types ---

export interface LoanRecommendation {
  id: string;
  assessment_id: string;
  decision: 'approve' | 'decline' | 'manual_review';
  max_amount: number;
  duration_months: number;
  apr_percent: number;
  amount_basis: string;
  duration_basis: string;
  apr_basis: string;
  admin_comment: string | null;
  admin_override: boolean;
  override_justification: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// --- Money Attitudinal Profile Types ---

export interface MoneyProfile {
  name: string;
  description: string;
  trait_signature: Partial<OceanScores>;
  pd_modifier: number;
  risk_interpretation: string;
}

// --- API Request/Response Types ---

export interface GameStartRequest {
  user_id: string;
  device_info: DeviceInfo;
}

export interface GameStartResponse {
  session_id: string;
  question: GeneratedQuestion;
  progress: number;
  total_estimated: number;
}

export interface GameNextRequest {
  session_id: string;
  response: QuestionResponse;
}

export interface GameNextResponse {
  question: GeneratedQuestion | null;
  progress: number;
  total_estimated: number;
  phase1_complete: boolean;
}

export interface GameCompleteRequest {
  session_id: string;
}

export interface GameCompleteResponse {
  decision: 'approved' | 'pending_approval';
  message: string;
  profile_name: string;
}

export interface BehavioralSignalsRequest {
  session_id: string;
  signals: Omit<BehavioralSignals, 'id' | 'session_id' | 'behavioral_scores' | 'bart_score'>;
}

export interface BehavioralScoreResponse {
  decision: 'approved' | 'pending_approval';
  message: string;
  profile_name: string;
}

// --- Admin Types ---

export interface AdminSessionListItem {
  session_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  duration_sec: number | null;
  pd_blended: number | null;
  risk_rating: RiskRating | null;
  decision: AssessmentDecision;
  consistency_flag: ConsistencyFlag | null;
  money_profile: string | null;
}

export interface AdminDetailResponse {
  session: Session;
  assessment: Assessment;
  responses: QuestionResponse[];
  behavioral_signals: BehavioralSignals | null;
  loan_recommendation: LoanRecommendation | null;
}

export interface AdminOverrideRequest {
  assessment_id: string;
  decision: 'approve' | 'decline' | 'manual_review';
  justification: string;
  admin_email: string;
  loan_adjustment?: {
    max_amount?: number;
    duration_months?: number;
    apr_percent?: number;
  };
}
