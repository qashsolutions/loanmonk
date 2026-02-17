// ============================================================
// Scoring Engine - Main Entry Point
// Full assessment pipeline: Phase 1 → Phase 2 → Blended → Decision
// ============================================================

export { computeTraitAverages, computeTraitVariances, selectHighestVarianceTrait, isAssessmentComplete, normalizeScore, denormalizeScore } from './ocean.js';
export { computeRiskContributions, computeWeightedRisk, computePD, applyProfileModifier, getRiskRating, calculateFullPD } from './pd.js';
export { computeAllBehavioralScores, computeBartScore } from './behavioral.js';
export { blendScores, computeConsistencyIndex, getConsistencyFlag } from './blending.js';
export { matchMoneyProfile, generateBlendedProfileName } from './profiles.js';
export { determineLoanDecision } from './loan.js';
export type { LoanDecisionResult } from './loan.js';
