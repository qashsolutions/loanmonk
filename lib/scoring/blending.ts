// ============================================================
// Phase 1 + Phase 2 Score Blending Engine
// Combines self-report OCEAN scores with behavioral observations
// ============================================================

import type { OceanScores, OceanTrait, NormalizedOceanScores, ConsistencyIndex, ConsistencyFlag } from '../types/index.js';
import { BLENDING_WEIGHTS, CONSISTENCY_THRESHOLDS, TRAIT_WEIGHTS } from '../constants/index.js';
import { normalizeScore, denormalizeScore } from './ocean.js';

/**
 * Blend Phase 1 (self-report) and Phase 2 (behavioral) OCEAN scores.
 *
 * Uses per-trait weights from BLENDING_WEIGHTS:
 * - C: 55/45 (behavioral weight important for conscientiousness)
 * - N: 50/50 (equally measurable)
 * - A: 60/40 (harder to measure behaviorally)
 * - O: 45/55 (better measured by actual exploration behavior)
 * - E: 55/45 (moderately measurable behaviorally)
 */
export function blendScores(
  phase1Scores: OceanScores,
  phase2Scores: NormalizedOceanScores,
): OceanScores {
  const traits: OceanTrait[] = ['O', 'C', 'E', 'A', 'N'];
  const blended: Partial<OceanScores> = {};

  for (const trait of traits) {
    const weights = BLENDING_WEIGHTS[trait];
    const phase1Normalized = normalizeScore(phase1Scores[trait]);
    const blendedNormalized = weights.phase1 * phase1Normalized + weights.phase2 * phase2Scores[trait];
    blended[trait] = denormalizeScore(blendedNormalized);
  }

  return blended as OceanScores;
}

/**
 * Compute consistency index between Phase 1 and Phase 2 scores.
 *
 * Measures how well self-reported traits match observed behavior.
 * Large discrepancies flag potential gaming.
 *
 * Thresholds:
 * < 0.20 = Highly consistent (trustworthy)
 * 0.20-0.40 = Normal variance (acceptable)
 * 0.40-0.60 = Moderate discrepancy (review recommended)
 * > 0.60 = High discrepancy (possible gaming, flag for manual review)
 */
export function computeConsistencyIndex(
  phase1Scores: OceanScores,
  phase2Scores: NormalizedOceanScores,
): ConsistencyIndex {
  const traits: OceanTrait[] = ['O', 'C', 'E', 'A', 'N'];
  const perTrait: Partial<Record<OceanTrait, number>> = {};

  for (const trait of traits) {
    const phase1Normalized = normalizeScore(phase1Scores[trait]);
    perTrait[trait] = Math.abs(phase1Normalized - phase2Scores[trait]);
  }

  // Weighted average using trait importance weights
  const overall = traits.reduce(
    (sum, trait) => sum + TRAIT_WEIGHTS[trait] * (perTrait[trait] ?? 0),
    0,
  );

  const flag = getConsistencyFlag(overall);

  return {
    C: perTrait.C!,
    N: perTrait.N!,
    A: perTrait.A!,
    O: perTrait.O!,
    E: perTrait.E!,
    overall,
    flag,
  };
}

/**
 * Get the consistency flag based on overall consistency score.
 */
export function getConsistencyFlag(overall: number): ConsistencyFlag {
  if (overall < CONSISTENCY_THRESHOLDS.highly_consistent) return 'highly_consistent';
  if (overall < CONSISTENCY_THRESHOLDS.normal_variance) return 'normal_variance';
  if (overall < CONSISTENCY_THRESHOLDS.moderate_discrepancy) return 'moderate_discrepancy';
  return 'high_discrepancy';
}
