// ============================================================
// Loan Decision & Recommendation Engine
// Determines approval, recommended amount, duration, and APR
// ============================================================

import type { RiskRating, AssessmentDecision, ConsistencyIndex } from '../types/index.js';
import { LOAN_THRESHOLDS, LOAN_PARAMS } from '../constants/index.js';

export interface LoanDecisionResult {
  decision: AssessmentDecision;
  userFacingDecision: 'approved' | 'pending_approval';
  maxAmount: number;
  durationMonths: number;
  aprPercent: number;
  amountBasis: string;
  durationBasis: string;
  aprBasis: string;
}

/**
 * Determine the loan decision based on PD score and consistency.
 *
 * User-facing: only "Approved" or "Pending Approval" (never decline/denied).
 * Internal: approved, pending_approval, manual_review, or declined.
 *
 * Rules:
 * - PD < 8% AND consistency < 0.40 → auto approve
 * - PD < 8% AND consistency >= 0.40 → manual review (shows as "pending_approval")
 * - PD 8-18% → pending_approval (manual review)
 * - PD > 18% → pending_approval (manual review, likely decline)
 * - Consistency > 0.60 → always forces manual review regardless of PD
 */
export function determineLoanDecision(
  pd: number,
  riskRating: RiskRating,
  consistency: ConsistencyIndex | null,
): LoanDecisionResult {
  const consistencyOverall = consistency?.overall ?? 0;

  let decision: AssessmentDecision;
  let userFacingDecision: 'approved' | 'pending_approval';

  // High consistency discrepancy always forces review
  if (consistencyOverall > LOAN_THRESHOLDS.consistency_review_threshold) {
    decision = 'manual_review';
    userFacingDecision = 'pending_approval';
  } else if (pd < LOAN_THRESHOLDS.auto_approve_pd) {
    decision = 'approved';
    userFacingDecision = 'approved';
  } else if (pd < LOAN_THRESHOLDS.manual_review_pd) {
    decision = 'pending_approval';
    userFacingDecision = 'pending_approval';
  } else {
    decision = 'manual_review';
    userFacingDecision = 'pending_approval';
  }

  // Generate loan parameters based on risk rating
  const maxAmount = LOAN_PARAMS.max_amount[riskRating];
  const durationMonths = LOAN_PARAMS.duration_months[riskRating];
  const aprPercent = LOAN_PARAMS.apr_percent[riskRating];

  return {
    decision,
    userFacingDecision,
    maxAmount,
    durationMonths,
    aprPercent,
    amountBasis: `Based on ${riskRating} risk rating (PD: ${(pd * 100).toFixed(1)}%)`,
    durationBasis: `Standard ${riskRating}-risk term`,
    aprBasis: `Risk-adjusted rate for ${riskRating} risk tier`,
  };
}
