// ============================================================
// POST /api/admin/override
// Admin manual override of loan decision with justification
// All overrides are audit-logged
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/utils/supabase.js';
import type { AdminOverrideRequest } from '../../lib/types/index.js';
import { LOAN_PARAMS } from '../../lib/constants/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const {
      assessment_id,
      decision,
      justification,
      admin_email,
      loan_adjustment,
    } = req.body as AdminOverrideRequest;

    if (!assessment_id || !decision || !justification || !admin_email) {
      return res.status(400).json({
        error: 'assessment_id, decision, justification, and admin_email are required',
      });
    }

    if (!['approve', 'decline', 'manual_review'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approve, decline, or manual_review' });
    }

    const supabase = getServerSupabase();

    // Verify admin exists
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('email', admin_email)
      .single();

    if (!admin) {
      return res.status(403).json({ error: 'Admin user not found' });
    }

    // Verify assessment exists
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessment_id)
      .single();

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Map override decision to assessment decision format
    const assessmentDecision = decision === 'approve' ? 'approved' :
                                decision === 'decline' ? 'declined' : 'manual_review';

    // Update assessment decision
    await supabase
      .from('assessments')
      .update({ decision: assessmentDecision })
      .eq('id', assessment_id);

    // Update or create loan recommendation with override
    const riskRating = assessment.risk_rating as 'low' | 'moderate' | 'elevated';
    const now = new Date().toISOString();

    const loanUpdate = {
      decision,
      admin_override: true,
      override_justification: justification,
      reviewed_by: admin_email,
      reviewed_at: now,
      admin_comment: justification,
      max_amount: loan_adjustment?.max_amount ?? LOAN_PARAMS.max_amount[riskRating],
      duration_months: loan_adjustment?.duration_months ?? LOAN_PARAMS.duration_months[riskRating],
      apr_percent: loan_adjustment?.apr_percent ?? LOAN_PARAMS.apr_percent[riskRating],
    };

    // Check if loan recommendation exists
    const { data: existingRec } = await supabase
      .from('loan_recommendations')
      .select('id')
      .eq('assessment_id', assessment_id)
      .single();

    if (existingRec) {
      await supabase
        .from('loan_recommendations')
        .update(loanUpdate)
        .eq('id', existingRec.id);
    } else {
      await supabase
        .from('loan_recommendations')
        .insert({
          assessment_id,
          ...loanUpdate,
          amount_basis: 'Admin override',
          duration_basis: 'Admin override',
          apr_basis: 'Admin override',
        });
    }

    return res.status(200).json({
      success: true,
      assessment_id,
      new_decision: decision,
      overridden_by: admin_email,
      overridden_at: now,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Internal server error', details: errMsg });
  }
}
