// ============================================================
// POST /api/game/start
// Creates a new assessment session, generates first question batch
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/utils/supabase.js';
import { generateSessionSeed, selectIndustry, hashIP } from '../../lib/utils/session.js';
import { buildSystemPrompt, buildUserPrompt, selectOptimalQuestion } from '../../lib/utils/claude-prompt.js';
import type { GameStartRequest, GameStartResponse, GeneratedQuestion, TraitVariances } from '../../lib/types/index.js';
import { QUESTION_CONFIG } from '../../lib/constants/index.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, device_info } = req.body as GameStartRequest;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const supabase = getServerSupabase();

    // Generate unique session seed
    const sessionSeed = await generateSessionSeed(user_id);
    const targetIndustry = selectIndustry(sessionSeed);
    const ipHash = req.headers['x-forwarded-for']
      ? await hashIP(String(req.headers['x-forwarded-for']))
      : null;

    // Create session record
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id,
        session_seed: sessionSeed,
        device_info: device_info || {},
        ip_hash: ipHash,
        status: 'in_progress',
        phase1_started_at: new Date().toISOString(),
        target_industry: targetIndustry,
        current_trait_variances: { O: 1.0, C: 1.0, E: 1.0, A: 1.0, N: 1.0 },
        previous_scenarios: [],
      })
      .select()
      .single();

    if (sessionError || !session) {
      return res.status(500).json({ error: 'Failed to create session', details: sessionError?.message });
    }

    // Generate first question batch from Claude API
    const initialVariances: TraitVariances = { O: 1.0, C: 1.0, E: 1.0, A: 1.0, N: 1.0 };

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      sessionSeed,
      traitsMeasured: {},
      traitVariances: initialVariances,
      previousScenarios: [],
      targetIndustry,
      questionCount: 0,
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

    // Select optimal question using Bayesian adaptive logic
    const selectedIndex = selectOptimalQuestion(candidates, initialVariances, []);
    const selectedQuestion = candidates[selectedIndex];

    // Update session with first scenario theme
    await supabase
      .from('sessions')
      .update({
        previous_scenarios: [selectedQuestion.scenario_theme],
        question_count: 1,
      })
      .eq('id', session.id);

    const response: GameStartResponse = {
      session_id: session.id,
      question: selectedQuestion,
      progress: 1,
      total_estimated: QUESTION_CONFIG.min_questions,
    };

    return res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Internal server error', details: message });
  }
}
