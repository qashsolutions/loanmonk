// ============================================================
// POST /api/game/next
// Accepts response to current question, generates next question
// Returns null question when Phase 1 is complete
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/utils/supabase.js';
import { buildSystemPrompt, buildUserPrompt, selectOptimalQuestion } from '../../lib/utils/claude-prompt.js';
import { computeTraitAverages, computeTraitVariances, isAssessmentComplete } from '../../lib/scoring/ocean.js';
import { QUESTION_CONFIG } from '../../lib/constants/index.js';
import type { GameNextRequest, GameNextResponse, GeneratedQuestion, QuestionResponse, OceanTrait } from '../../lib/types/index.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { session_id, response: questionResponse } = req.body as GameNextRequest;

    if (!session_id || !questionResponse) {
      return res.status(400).json({ error: 'session_id and response are required' });
    }

    const supabase = getServerSupabase();

    // Fetch current session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Session is not in progress' });
    }

    // Store the response
    await supabase.from('responses').insert({
      session_id,
      question_index: questionResponse.question_index,
      question_type: questionResponse.question_type,
      trait: questionResponse.trait,
      score: questionResponse.score,
      response_time_ms: questionResponse.response_time_ms,
      raw_response: questionResponse.raw_response,
      hesitation_count: questionResponse.hesitation_count,
      changed_answer: questionResponse.changed_answer,
    });

    // Fetch all responses for this session to compute trait state
    const { data: allResponses } = await supabase
      .from('responses')
      .select('*')
      .eq('session_id', session_id)
      .order('question_index', { ascending: true });

    const responses = (allResponses || []) as QuestionResponse[];
    const traitVariances = computeTraitVariances(responses);
    const questionCount = responses.length;

    // Build traits measured map
    const traitsMeasured: Partial<Record<OceanTrait, number[]>> = {};
    for (const r of responses) {
      if (!traitsMeasured[r.trait]) traitsMeasured[r.trait] = [];
      traitsMeasured[r.trait]!.push(r.score);
    }

    // Check if Phase 1 assessment is complete
    const complete = isAssessmentComplete(
      traitVariances,
      questionCount,
      QUESTION_CONFIG.variance_threshold,
      QUESTION_CONFIG.min_questions,
      QUESTION_CONFIG.max_questions,
    );

    if (complete) {
      // Mark Phase 1 complete
      await supabase
        .from('sessions')
        .update({
          status: 'phase1_complete',
          phase1_completed_at: new Date().toISOString(),
          question_count: questionCount,
          current_trait_variances: traitVariances,
        })
        .eq('id', session_id);

      const result: GameNextResponse = {
        question: null,
        progress: questionCount,
        total_estimated: questionCount,
        phase1_complete: true,
      };
      return res.status(200).json(result);
    }

    // Generate next question batch from Claude API
    const previousScenarios: string[] = session.previous_scenarios || [];
    const previousTypes = responses.map((r: QuestionResponse) => r.question_type);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      sessionSeed: session.session_seed,
      traitsMeasured,
      traitVariances,
      previousScenarios,
      targetIndustry: session.target_industry,
      questionCount,
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    let candidates: GeneratedQuestion[];

    try {
      candidates = JSON.parse(responseText);
    } catch {
      return res.status(500).json({ error: 'Failed to parse Claude API response' });
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(500).json({ error: 'Invalid question batch from Claude API' });
    }

    // Select optimal question
    const selectedIndex = selectOptimalQuestion(candidates, traitVariances, previousTypes);
    const selectedQuestion = candidates[selectedIndex];

    // Update session
    await supabase
      .from('sessions')
      .update({
        previous_scenarios: [...previousScenarios, selectedQuestion.scenario_theme],
        question_count: questionCount + 1,
        current_trait_variances: traitVariances,
      })
      .eq('id', session_id);

    // Estimate remaining questions
    const traitsBelowThreshold = Object.values(traitVariances).filter(
      v => v < QUESTION_CONFIG.variance_threshold,
    ).length;
    const estimatedTotal = Math.max(
      questionCount + 1,
      Math.min(QUESTION_CONFIG.max_questions, questionCount + (5 - traitsBelowThreshold)),
    );

    const result: GameNextResponse = {
      question: selectedQuestion,
      progress: questionCount + 1,
      total_estimated: estimatedTotal,
      phase1_complete: false,
    };

    return res.status(200).json(result);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Internal server error', details: errMessage });
  }
}
