// ============================================================
// Probability of Default (PD) Calculation Engine
// Based on: ConfirmU validated model (82% accuracy, Gini 42-44)
// Formula source: CreditMind-Claude-Code-Prompt.docx Section 5.2
// ============================================================

import type { OceanScores, RiskRating } from '../types/index.js';
import { TRAIT_WEIGHTS, PD_MIN, PD_MAX, PD_RANGE, RISK_THRESHOLDS } from '../constants/index.js';

/**
 * Step 1: Normalize each OCEAN trait to a 0-1 risk contribution.
 *
 * C is inverted (low C = high risk).
 * N, A, O, E are direct (high = higher risk).
 */
export function computeRiskContributions(scores: OceanScores): Record<keyof OceanScores, number> {
  return {
    C: (5 - scores.C) / 4,       // Inverted: low C = high risk
    N: (scores.N - 1) / 4,       // Direct: high N = high risk
    A: (scores.A - 1) / 4,       // Direct: high A = slight risk
    O: (scores.O - 1) / 4,       // Direct: high O = slight risk
    E: (scores.E - 1) / 4,       // Direct: high E = slight risk
  };
}

/**
 * Step 2: Compute weighted risk score.
 * weightedRisk = 0.35*riskC + 0.25*riskN + 0.18*riskA + 0.12*riskO + 0.10*riskE
 */
export function computeWeightedRisk(scores: OceanScores): number {
  const risks = computeRiskContributions(scores);
  return (
    TRAIT_WEIGHTS.C * risks.C +
    TRAIT_WEIGHTS.N * risks.N +
    TRAIT_WEIGHTS.A * risks.A +
    TRAIT_WEIGHTS.O * risks.O +
    TRAIT_WEIGHTS.E * risks.E
  );
}

/**
 * Step 3: Map weighted risk to PD percentage.
 * PD = min(0.35, max(0.02, 0.02 + weightedRisk * 0.33))
 * Calibrated range: 2% - 35%
 */
export function computePD(scores: OceanScores): number {
  const weightedRisk = computeWeightedRisk(scores);
  return Math.min(PD_MAX, Math.max(PD_MIN, PD_MIN + weightedRisk * PD_RANGE));
}

/**
 * Apply money profile modifier to PD score.
 * The modifier adjusts PD based on the attitudinal profile match.
 */
export function applyProfileModifier(pd: number, modifier: number): number {
  const modified = pd + modifier;
  return Math.min(PD_MAX, Math.max(PD_MIN, modified));
}

/**
 * Determine risk rating from PD score.
 */
export function getRiskRating(pd: number): RiskRating {
  if (pd < RISK_THRESHOLDS.low) return 'low';
  if (pd < RISK_THRESHOLDS.moderate) return 'moderate';
  return 'elevated';
}

/**
 * Full PD calculation pipeline.
 * Returns PD score, weighted risk, risk rating, and risk contributions.
 */
export function calculateFullPD(scores: OceanScores, profileModifier: number = 0) {
  const riskContributions = computeRiskContributions(scores);
  const weightedRisk = computeWeightedRisk(scores);
  const pdRaw = computePD(scores);
  const pdModified = applyProfileModifier(pdRaw, profileModifier);
  const riskRating = getRiskRating(pdModified);

  return {
    riskContributions,
    weightedRisk,
    pdRaw,
    pdModified,
    riskRating,
  };
}
