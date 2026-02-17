// ============================================================
// CreditMind Constants & Configuration
// ============================================================

import type { OceanTrait, MoneyProfile } from '../types/index.js';

// --- OCEAN Trait Weights for PD Calculation ---
// Based on: Nyhus & Webley 2001, Donnelly et al. 2012, ConfirmU validation
export const TRAIT_WEIGHTS: Record<OceanTrait, number> = {
  C: 0.35, // Conscientiousness - strongest predictor
  N: 0.25, // Neuroticism - second strongest
  A: 0.18, // Agreeableness
  O: 0.12, // Openness
  E: 0.10, // Extraversion
};

// --- PD Score Bounds ---
export const PD_MIN = 0.02; // 2% floor
export const PD_MAX = 0.35; // 35% ceiling
export const PD_RANGE = PD_MAX - PD_MIN; // 0.33

// --- Risk Rating Thresholds ---
export const RISK_THRESHOLDS = {
  low: 0.08,      // PD < 8%
  moderate: 0.18,  // PD 8-18%
  // elevated: PD > 18%
} as const;

// --- Phase 1/Phase 2 Blending Weights ---
// Phase 1 weight, Phase 2 weight (must sum to 1.0)
export const BLENDING_WEIGHTS: Record<OceanTrait, { phase1: number; phase2: number }> = {
  C: { phase1: 0.55, phase2: 0.45 }, // C is most important, heavy behavioral weight
  N: { phase1: 0.50, phase2: 0.50 }, // N equally measurable both ways
  A: { phase1: 0.60, phase2: 0.40 }, // A harder to measure behaviorally
  O: { phase1: 0.45, phase2: 0.55 }, // O better measured by actual exploration behavior
  E: { phase1: 0.55, phase2: 0.45 }, // E moderately measurable behaviorally
};

// --- Consistency Index Thresholds ---
export const CONSISTENCY_THRESHOLDS = {
  highly_consistent: 0.20,    // < 0.20
  normal_variance: 0.40,      // 0.20 - 0.40
  moderate_discrepancy: 0.60, // 0.40 - 0.60
  // high_discrepancy: > 0.60
} as const;

// --- BART Cargo Risk Curve ---
// Probability of tip-over at each crate count
export const BART_RISK_CURVE: number[] = [
  0.00,  // 1 crate: 0% loss
  0.05,  // 2 crates: 5% loss
  0.15,  // 3 crates: 15% loss
  0.30,  // 4 crates: 30% loss
  0.50,  // 5 crates: 50% loss
  0.75,  // 6 crates: 75% loss
  0.90,  // 7+ crates: 90% loss
];

// --- Supply Run Game Config ---
export const SUPPLY_RUN_CONFIG = {
  duration_ms: 60000,       // 60 seconds
  map_width: 20,            // tiles
  map_height: 15,           // tiles
  tile_size: 32,            // pixels
  customer_count: 4,
  crate_base_reward: 10,
  bank_bonus_multiplier: 1.1,
  max_cargo: 7,
  event_types: ['thief', 'helper', 'premium_customer', 'shortcut'] as const,
} as const;

// --- Question Generation ---
export const QUESTION_CONFIG = {
  min_questions: 8,
  max_questions: 15,
  variance_threshold: 0.3,  // Stop when all trait variances below this
  parallel_candidates: 3,   // Claude generates 3 questions per batch
  question_types: ['grid', 'bars', 'budget', 'timeline', 'reaction', 'tradeoff'] as const,
} as const;

// --- Industries for Scenario Generation ---
export const INDUSTRIES = [
  'retail', 'restaurant', 'technology', 'agriculture',
  'manufacturing', 'logistics', 'healthcare', 'education',
  'construction', 'services', 'textiles', 'tourism',
] as const;

// --- Money Attitudinal Profiles ---
// Base profiles from ConfirmU validated model
export const MONEY_PROFILES: MoneyProfile[] = [
  {
    name: 'Prudent Planner',
    description: 'Methodical, budget-conscious, risk-averse. Plans expenditures carefully and maintains reserves.',
    trait_signature: { C: 4.5, N: 1.5 },
    pd_modifier: -0.03,
    risk_interpretation: 'Low risk — disciplined financial behavior predicted',
  },
  {
    name: 'Anxious Saver',
    description: 'High financial anxiety drives excessive caution. May under-invest in growth opportunities.',
    trait_signature: { N: 4.5, C: 3.5 },
    pd_modifier: -0.01,
    risk_interpretation: 'Low-moderate risk — anxiety drives caution but may impair decision-making under stress',
  },
  {
    name: 'Social Spender',
    description: 'Generous, relationship-driven spending. May prioritize social obligations over business needs.',
    trait_signature: { A: 4.5, E: 4.0 },
    pd_modifier: 0.02,
    risk_interpretation: 'Moderate risk — social pressure may lead to over-commitment',
  },
  {
    name: 'Impulsive Optimist',
    description: 'High risk tolerance, quick decisions, opportunistic. May overextend on promising but unvalidated ventures.',
    trait_signature: { O: 4.5, N: 1.5, C: 2.0 },
    pd_modifier: 0.05,
    risk_interpretation: 'Elevated risk — impulsivity and low planning discipline increase default probability',
  },
  {
    name: 'Cautious Traditionalist',
    description: 'Prefers proven methods, slow to adopt new approaches. Reliable but may miss growth opportunities.',
    trait_signature: { O: 1.5, C: 4.0 },
    pd_modifier: -0.02,
    risk_interpretation: 'Low risk — conservative approach reduces default probability',
  },
  {
    name: 'Balanced Operator',
    description: 'Moderate across all dimensions. Adaptable, pragmatic. Neither overly cautious nor reckless.',
    trait_signature: { C: 3.0, N: 3.0, A: 3.0, O: 3.0, E: 3.0 },
    pd_modifier: 0.00,
    risk_interpretation: 'Moderate risk — balanced profile with no extreme signals',
  },
  {
    name: 'Driven Achiever',
    description: 'Highly competitive, results-oriented. Strong financial discipline but may take calculated risks.',
    trait_signature: { C: 4.0, E: 4.5, N: 2.0 },
    pd_modifier: -0.01,
    risk_interpretation: 'Low-moderate risk — discipline offsets competitive risk-taking',
  },
  {
    name: 'Cautious Innovator',
    description: 'Creative and exploratory but with strong planning instincts. Measures risk before acting.',
    trait_signature: { O: 4.0, C: 4.0 },
    pd_modifier: -0.02,
    risk_interpretation: 'Low risk — innovation balanced by conscientiousness',
  },
  {
    name: 'Social Planner',
    description: 'Community-oriented with strong organizational skills. Invests in relationships and structures.',
    trait_signature: { A: 4.0, C: 4.0 },
    pd_modifier: -0.01,
    risk_interpretation: 'Low-moderate risk — social investment balanced by planning',
  },
  {
    name: 'Stressed Reactor',
    description: 'High emotional reactivity, low planning discipline. Financial decisions driven by immediate pressures.',
    trait_signature: { N: 4.5, C: 1.5 },
    pd_modifier: 0.06,
    risk_interpretation: 'High risk — stress-driven decision-making with poor financial planning',
  },
];

// --- Loan Decision Thresholds ---
export const LOAN_THRESHOLDS = {
  auto_approve_pd: 0.08,        // PD < 8% = auto approve
  manual_review_pd: 0.18,       // PD 8-18% = pending approval (manual review)
  auto_decline_pd: 0.35,        // PD > 35% = decline (but we never auto-decline, goes to manual)
  consistency_review_threshold: 0.40, // consistency > 0.40 forces manual review
} as const;

// --- Loan Recommendation Parameters ---
export const LOAN_PARAMS = {
  // Max amounts by risk rating
  max_amount: {
    low: 50000,
    moderate: 25000,
    elevated: 10000,
  },
  // Duration in months by risk rating
  duration_months: {
    low: 36,
    moderate: 24,
    elevated: 12,
  },
  // APR by risk rating
  apr_percent: {
    low: 8.5,
    moderate: 14.0,
    elevated: 22.0,
  },
} as const;
