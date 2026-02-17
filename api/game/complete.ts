// ============================================================
// POST /api/game/complete
// Triggers Phase 1 PD calculation, stores assessment
// Called after all self-report questions are answered
// If Phase 2 is skipped, this is the final step
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/utils/supabase.js';
import {
  computeTraitAverages,
  calculateFullPD,
  matchMoneyProfile,
  determineLoanDecision,
} from '../../lib/scoring/index.js';
import type { GameCompleteRequest, GameCompleteResponse, QuestionResponse } from '../../lib/types/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { session_id } = req.body as GameCompleteRequest;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const supabase = getServerSupabase();

    // Verify session exists and is in the right state
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'phase1_complete' && session.status !== 'in_progress') {
      return res.status(400).json({ error: `Session status is "${session.status}", expected "phase1_complete"` });
    }

    // Fetch all responses
    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('session_id', session_id)
      .order('question_index', { ascending: true });

    if (!responses || responses.length === 0) {
      return res.status(400).json({ error: 'No responses found for this session' });
    }

    // Compute OCEAN trait averages
    const traitScores = computeTraitAverages(responses as QuestionResponse[]);

    // Match money attitudinal profile
    const { profile, confidence } = matchMoneyProfile(traitScores);

    // Calculate PD with profile modifier
    const pdResult = calculateFullPD(traitScores, profile.pd_modifier);

    // Determine loan decision (Phase 1 only — no behavioral data yet)
    const loanDecision = determineLoanDecision(
      pdResult.pdModified,
      pdResult.riskRating,
      null, // No consistency index without Phase 2
    );

    // Compute behavioral signals summary from Phase 1 responses
    const avgResponseTime = responses.reduce((s: number, r: { response_time_ms: number }) => s + r.response_time_ms, 0) / responses.length;
    const responseTimeVariance = responses.reduce(
      (s: number, r: { response_time_ms: number }) => s + (r.response_time_ms - avgResponseTime) ** 2, 0,
    ) / responses.length;
    const changedAnswerCount = responses.filter((r: { changed_answer: boolean }) => r.changed_answer).length;
    const totalHesitations = responses.reduce((s: number, r: { hesitation_count: number }) => s + r.hesitation_count, 0);

    // Store assessment
    const { data: assessment, error: assessError } = await supabase
      .from('assessments')
      .insert({
        session_id,
        trait_scores: traitScores,
        weighted_risk: pdResult.weightedRisk,
        pd_score: pdResult.pdRaw,
        pd_phase1_only: pdResult.pdModified,
        pd_modified: pdResult.pdModified,
        risk_rating: pdResult.riskRating,
        money_profile: profile.name,
        money_profile_modifier: profile.pd_modifier,
        decision: loanDecision.decision,
        behavioral_signals: {
          avg_response_time_ms: Math.round(avgResponseTime),
          response_time_variance: Math.round(responseTimeVariance),
          changed_answer_count: changedAnswerCount,
          total_hesitations: totalHesitations,
          completion_time_sec: session.duration_sec,
          question_count: responses.length,
        },
      })
      .select()
      .single();

    if (assessError || !assessment) {
      return res.status(500).json({ error: 'Failed to store assessment', details: assessError?.message });
    }

    // Create loan recommendation record
    await supabase.from('loan_recommendations').insert({
      assessment_id: assessment.id,
      decision: loanDecision.decision === 'approved' ? 'approve' : loanDecision.decision === 'declined' ? 'decline' : 'manual_review',
      max_amount: loanDecision.maxAmount,
      duration_months: loanDecision.durationMonths,
      apr_percent: loanDecision.aprPercent,
      amount_basis: loanDecision.amountBasis,
      duration_basis: loanDecision.durationBasis,
      apr_basis: loanDecision.aprBasis,
    });

    // Update session status
    const now = new Date().toISOString();
    await supabase
      .from('sessions')
      .update({
        status: 'phase1_complete',
        phase1_completed_at: now,
        duration_sec: Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000),
      })
      .eq('id', session_id);

    // User-facing response: only approved or pending_approval
    const result: GameCompleteResponse = {
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
