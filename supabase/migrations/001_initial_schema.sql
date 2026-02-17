-- CreditMind Database Schema
-- Full schema for psychometric credit assessment system
-- Includes Phase 1 (self-report) and Phase 2 (behavioral game) tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: admin_users
-- Admin accounts for the dashboard
-- ============================================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reviewer' CHECK (role IN ('reviewer', 'manager', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: sessions
-- One row per assessment session (Phase 1 + Phase 2)
-- ============================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_seed TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_sec INT,
  device_info JSONB DEFAULT '{}',
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'phase1_complete', 'phase2_complete', 'completed', 'abandoned')),
  phase1_started_at TIMESTAMPTZ,
  phase1_completed_at TIMESTAMPTZ,
  phase2_started_at TIMESTAMPTZ,
  phase2_completed_at TIMESTAMPTZ,
  question_count INT DEFAULT 0,
  current_trait_variances JSONB DEFAULT '{"O": 1.0, "C": 1.0, "E": 1.0, "A": 1.0, "N": 1.0}',
  previous_scenarios JSONB DEFAULT '[]',
  target_industry TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);

-- ============================================================
-- TABLE: responses
-- Individual question responses (Phase 1 self-report)
-- ============================================================
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('grid', 'bars', 'budget', 'timeline', 'reaction', 'tradeoff')),
  question_text TEXT,
  trait TEXT NOT NULL CHECK (trait IN ('O', 'C', 'E', 'A', 'N')),
  score NUMERIC(3,1) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
  response_time_ms INT NOT NULL,
  raw_response JSONB NOT NULL DEFAULT '{}',
  question_data JSONB DEFAULT '{}',
  hesitation_count INT DEFAULT 0,
  changed_answer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_responses_session_id ON responses(session_id);
CREATE INDEX idx_responses_trait ON responses(trait);

-- ============================================================
-- TABLE: behavioral_signals
-- Phase 2 Supply Run raw behavioral data
-- ============================================================
CREATE TABLE behavioral_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  game_seed TEXT NOT NULL,
  duration_ms INT NOT NULL,
  -- Raw signals
  tap_velocities JSONB DEFAULT '[]',
  path_records JSONB DEFAULT '[]',
  banking_events JSONB DEFAULT '[]',
  cargo_loads JSONB DEFAULT '[]',
  loss_events JSONB DEFAULT '[]',
  sharing_events JSONB DEFAULT '[]',
  exploration_tiles INT DEFAULT 0,
  total_tiles INT DEFAULT 0,
  crowd_time_ms INT DEFAULT 0,
  quiet_time_ms INT DEFAULT 0,
  multi_order_counts JSONB DEFAULT '[]',
  -- Computed behavioral trait scores
  behavioral_scores JSONB DEFAULT '{}',
  bart_score NUMERIC(4,3),
  -- Frame-level data for heatmap replay
  frame_events JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_behavioral_signals_session_id ON behavioral_signals(session_id);

-- ============================================================
-- TABLE: assessments
-- Final computed assessment with PD score
-- Includes Phase 1, Phase 2, and blended results
-- ============================================================
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  -- Phase 1 self-report scores
  trait_scores JSONB NOT NULL DEFAULT '{}',
  weighted_risk NUMERIC(5,4),
  pd_score NUMERIC(5,3),
  -- Phase 2 behavioral
  phase2_signal_id UUID REFERENCES behavioral_signals(id),
  blended_trait_scores JSONB DEFAULT '{}',
  consistency_index JSONB DEFAULT '{}',
  pd_phase1_only NUMERIC(5,3),
  pd_blended NUMERIC(5,3),
  -- Final outputs
  pd_modified NUMERIC(5,3),
  risk_rating TEXT CHECK (risk_rating IN ('low', 'moderate', 'elevated')),
  money_profile TEXT,
  money_profile_modifier NUMERIC(3,2) DEFAULT 0.00,
  gini_contribution NUMERIC(5,4),
  behavioral_signals JSONB DEFAULT '{}',
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('approved', 'pending_approval', 'declined', 'manual_review', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessments_session_id ON assessments(session_id);
CREATE INDEX idx_assessments_risk_rating ON assessments(risk_rating);
CREATE INDEX idx_assessments_decision ON assessments(decision);
CREATE INDEX idx_assessments_created_at ON assessments(created_at DESC);

-- ============================================================
-- TABLE: loan_recommendations
-- Admin-facing loan decision details
-- ============================================================
CREATE TABLE loan_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'decline', 'manual_review')),
  max_amount NUMERIC(10,2),
  duration_months INT,
  apr_percent NUMERIC(4,2),
  amount_basis TEXT,
  duration_basis TEXT,
  apr_basis TEXT,
  admin_comment TEXT,
  admin_override BOOLEAN NOT NULL DEFAULT false,
  override_justification TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_recs_assessment_id ON loan_recommendations(assessment_id);
CREATE INDEX idx_loan_recs_decision ON loan_recommendations(decision);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by Vercel Edge Functions)
-- End users can only see their own session status
CREATE POLICY "Users can view own session status"
  ON sessions FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- End users can NEVER see assessments, scores, or loan details
-- Only service role (Vercel) and admin can access these
CREATE POLICY "Service role full access to assessments"
  ON assessments FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to responses"
  ON responses FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to behavioral_signals"
  ON behavioral_signals FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to loan_recommendations"
  ON loan_recommendations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin users self-access"
  ON admin_users FOR SELECT
  USING (true);

-- ============================================================
-- SEED: Default admin user
-- ============================================================
INSERT INTO admin_users (email, password_hash, role)
VALUES ('admin@creditmind.app', crypt('changeme', gen_salt('bf')), 'superadmin');
