// ============================================================
// GET /api/game/behavioral-config
// Returns Supply Run game configuration for Phase 2
// Called after Phase 1 completes to initialize the behavioral game
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/utils/supabase.js';
import { SUPPLY_RUN_CONFIG, BART_RISK_CURVE } from '../../lib/constants/index.js';
import type { BehavioralConfig, ScheduledEvent } from '../../lib/types/index.js';

/**
 * Generate a deterministic event schedule based on game seed.
 * Events are spaced across the 60-second game to create decision points.
 */
function generateEventSchedule(gameSeed: string): ScheduledEvent[] {
  // Use seed to deterministically place events
  const seedNum = parseInt(gameSeed.slice(0, 8), 16);
  const events: ScheduledEvent[] = [];

  // Thief event: appears between 15-25 seconds
  const thiefTime = 15000 + (seedNum % 10000);
  events.push({
    type: 'thief',
    trigger_time_ms: thiefTime,
    position: {
      x: 5 + (seedNum % 10),
      y: 3 + ((seedNum >> 4) % 8),
    },
    params: {
      steal_amount_percent: 0.3 + (seedNum % 20) / 100,
      escape_window_ms: 2000,
    },
  });

  // Helper event: appears between 25-40 seconds
  const helperTime = 25000 + ((seedNum >> 8) % 15000);
  events.push({
    type: 'helper',
    trigger_time_ms: helperTime,
    position: {
      x: 10 + ((seedNum >> 12) % 8),
      y: 5 + ((seedNum >> 16) % 6),
    },
    params: {
      speed_boost: 1.5,
      duration_ms: 5000,
      cost: 0, // Free help — tests agreeableness (accepting help)
    },
  });

  // Premium customer: appears between 30-50 seconds
  const premiumTime = 30000 + ((seedNum >> 20) % 20000);
  events.push({
    type: 'premium_customer',
    trigger_time_ms: premiumTime,
    position: {
      x: 15 + ((seedNum >> 24) % 4),
      y: 2 + ((seedNum >> 28) % 10),
    },
    params: {
      reward_multiplier: 3.0,
      distance_penalty: 1.5, // Farther away than normal customers
    },
  });

  // Shortcut: available throughout but revealed at ~20s
  events.push({
    type: 'shortcut',
    trigger_time_ms: 20000 + ((seedNum >> 4) % 5000),
    position: {
      x: 8 + ((seedNum >> 8) % 4),
      y: 7 + ((seedNum >> 12) % 3),
    },
    params: {
      path_reduction: 0.6, // 60% of normal distance
      visibility: 'subtle', // Not obviously highlighted
    },
  });

  return events.sort((a, b) => a.trigger_time_ms - b.trigger_time_ms);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sessionId = req.query.session_id as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'session_id query parameter is required' });
    }

    const supabase = getServerSupabase();

    // Verify session is in correct state
    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, session_seed, status')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'phase1_complete') {
      return res.status(400).json({ error: 'Phase 1 must be completed before starting Phase 2' });
    }

    // Generate game seed from session seed
    const encoder = new TextEncoder();
    const data = encoder.encode(session.session_seed + ':phase2');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const gameSeed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Update session to mark Phase 2 start
    await supabase
      .from('sessions')
      .update({
        phase2_started_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    const config: BehavioralConfig = {
      game_seed: gameSeed,
      duration_ms: SUPPLY_RUN_CONFIG.duration_ms,
      map_width: SUPPLY_RUN_CONFIG.map_width,
      map_height: SUPPLY_RUN_CONFIG.map_height,
      customer_count: SUPPLY_RUN_CONFIG.customer_count,
      event_schedule: generateEventSchedule(gameSeed),
      cargo_risk_curve: BART_RISK_CURVE,
    };

    return res.status(200).json(config);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Internal server error', details: errMsg });
  }
}
