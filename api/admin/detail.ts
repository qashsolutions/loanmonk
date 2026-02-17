// ============================================================
// GET /api/admin/detail?id=<session_id>
// Full assessment detail for a single session
// Includes all sections from spec Section 6.2
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/utils/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sessionId = req.query.id as string;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const supabase = getServerSupabase();

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Fetch assessment
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    // Fetch all responses
    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_index', { ascending: true });

    // Fetch behavioral signals (if Phase 2 completed)
    const { data: behavioralSignals } = await supabase
      .from('behavioral_signals')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch loan recommendation
    let loanRecommendation = null;
    if (assessment) {
      const { data } = await supabase
        .from('loan_recommendations')
        .select('*')
        .eq('assessment_id', assessment.id)
        .single();
      loanRecommendation = data;
    }

    return res.status(200).json({
      session,
      assessment,
      responses: responses || [],
      behavioral_signals: behavioralSignals || null,
      loan_recommendation: loanRecommendation,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Internal server error', details: errMsg });
  }
}
