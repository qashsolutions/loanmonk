// ============================================================
// POST /api/game/behavioral-score
// Computes blended PD score (Phase 1 + Phase 2)
// Final assessment step — produces the definitive PD
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/utils/supabase.js';
import {
  blendScores,
  computeConsistencyIndex,
  calculateFullPD,
  matchMoneyProfile,
  determineLoanDecision,
} from '../../lib/scoring/index.js';
import type { BehavioralScoreResponse, NormalizedOceanScores, OceanScores } from '../../lib/types/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { session_id } = req.body as { session_id: string };

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const supabase = getServerSupabase();

    // Fetch session
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'phase2_complete') {
      return res.status(400).json({ error: 'Phase 2 must be completed before computing blended score' });
    }

    // Fetch Phase 1 assessment
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (!assessment) {
      return res.status(404).json({ error: 'Phase 1 assessment not found' });
    }

    // Fetch Phase 2 behavioral signals
    const { data: behavioralSignal } = await supabase
      .from('behavioral_signals')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!behavioralSignal) {
      return res.status(404).json({ error: 'Behavioral signals not found' });
    }

    const phase1Scores = assessment.trait_scores as OceanScores;
    const phase2Scores = behavioralSignal.behavioral_scores as NormalizedOceanScores;

    // Blend Phase 1 + Phase 2 scores
    const blendedScores = blendScores(phase1Scores, phase2Scores);

    // Compute consistency index
    const consistency = computeConsistencyIndex(phase1Scores, phase2Scores);

    // Re-calculate PD with blended scores
    const { profile } = matchMoneyProfile(blendedScores);
    const pdResult = calculateFullPD(blendedScores, profile.pd_modifier);

    // Determine final loan decision with consistency data
    const loanDecision = determineLoanDecision(
      pdResult.pdModified,
      pdResult.riskRating,
      consistency,
    );

    // Update assessment with blended results
    await supabase
      .from('assessments')
      .update({
        phase2_signal_id: behavioralSignal.id,
        blended_trait_scores: blendedScores,
        consistency_index: consistency,
        pd_blended: pdResult.pdModified,
        pd_modified: pdResult.pdModified,
        risk_rating: pdResult.riskRating,
        money_profile: profile.name,
        money_profile_modifier: profile.pd_modifier,
        decision: loanDecision.decision,
      })
      .eq('id', assessment.id);

    // Update loan recommendation
    await supabase
      .from('loan_recommendations')
      .update({
        decision: loanDecision.decision === 'approved' ? 'approve' : loanDecision.decision === 'declined' ? 'decline' : 'manual_review',
        max_amount: loanDecision.maxAmount,
        duration_months: loanDecision.durationMonths,
        apr_percent: loanDecision.aprPercent,
        amount_basis: loanDecision.amountBasis,
        duration_basis: loanDecision.durationBasis,
        apr_basis: loanDecision.aprBasis,
      })
      .eq('assessment_id', assessment.id);

    // Mark session complete
    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_sec: Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000),
      })
      .eq('id', session_id);

    // User-facing response
    const result: BehavioralScoreResponse = {
      decision: loanDecision.userFacingDecision,
      message: loanDecision.userFacingDecision === 'approved'
        ? 'Congratulations! Your assessment is complete. You will receive details shortly.'
        : 'Thank you for completing the assessment. Our team is reviewing your profile and will be in touch within 24-48 hours.',
      profile_name: profile.name,
    };

    return res.status(200).json(result);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Internal server error', details: errMsg });
  }
}
