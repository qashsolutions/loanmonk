// ============================================================
// OCEAN Trait Scoring Engine
// Computes trait averages from Phase 1 responses
// ============================================================

import type { OceanTrait, OceanScores, TraitVariances, QuestionResponse } from '../types/index.js';

/**
 * Compute average OCEAN scores from an array of question responses.
 * Groups responses by trait and averages the scores.
 */
export function computeTraitAverages(responses: QuestionResponse[]): OceanScores {
  const traitScores: Record<OceanTrait, number[]> = {
    O: [], C: [], E: [], A: [], N: [],
  };

  for (const response of responses) {
    traitScores[response.trait].push(response.score);
  }

  return {
    O: average(traitScores.O, 3.0),
    C: average(traitScores.C, 3.0),
    E: average(traitScores.E, 3.0),
    A: average(traitScores.A, 3.0),
    N: average(traitScores.N, 3.0),
  };
}

/**
 * Compute trait measurement variances.
 * High variance = trait needs more measurement.
 * Used by Bayesian adaptive question selection.
 */
export function computeTraitVariances(responses: QuestionResponse[]): TraitVariances {
  const traitScores: Record<OceanTrait, number[]> = {
    O: [], C: [], E: [], A: [], N: [],
  };

  for (const response of responses) {
    traitScores[response.trait].push(response.score);
  }

  return {
    O: variance(traitScores.O),
    C: variance(traitScores.C),
    E: variance(traitScores.E),
    A: variance(traitScores.A),
    N: variance(traitScores.N),
  };
}

/**
 * Select the trait with highest variance (most uncertainty).
 * Used to determine which trait the next question should target.
 */
export function selectHighestVarianceTrait(variances: TraitVariances): OceanTrait {
  const traits: OceanTrait[] = ['O', 'C', 'E', 'A', 'N'];
  let maxVariance = -1;
  let maxTrait: OceanTrait = 'C'; // default to most important trait

  for (const trait of traits) {
    if (variances[trait] > maxVariance) {
      maxVariance = variances[trait];
      maxTrait = trait;
    }
  }

  return maxTrait;
}

/**
 * Determine if we have enough measurements to stop the assessment.
 * Stops when all traits have variance below threshold and we've asked enough questions.
 */
export function isAssessmentComplete(
  variances: TraitVariances,
  questionCount: number,
  varianceThreshold: number,
  minQuestions: number,
  maxQuestions: number,
): boolean {
  if (questionCount >= maxQuestions) return true;
  if (questionCount < minQuestions) return false;

  const allBelowThreshold = Object.values(variances).every(v => v < varianceThreshold);
  return allBelowThreshold;
}

/**
 * Normalize a 1-5 OCEAN score to 0-1 range.
 */
export function normalizeScore(score: number): number {
  return Math.max(0, Math.min(1, (score - 1) / 4));
}

/**
 * Denormalize a 0-1 score back to 1-5 range.
 */
export function denormalizeScore(normalized: number): number {
  return 1 + normalized * 4;
}

// --- Helpers ---

function average(values: number[], defaultValue: number): number {
  if (values.length === 0) return defaultValue;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 1.0; // High variance = needs more measurement
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}
