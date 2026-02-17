// ============================================================
// API Client for Game ↔ Vercel Edge Function Communication
// ============================================================

import type {
  GameStartRequest, GameStartResponse,
  GameNextRequest, GameNextResponse,
  GameCompleteRequest, GameCompleteResponse,
  BehavioralSignalsRequest, BehavioralScoreResponse, BehavioralConfig,
} from '../../../lib/types/index.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiCall<T>(path: string, method: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  startGame(request: GameStartRequest): Promise<GameStartResponse> {
    return apiCall('/api/game/start', 'POST', request);
  },

  nextQuestion(request: GameNextRequest): Promise<GameNextResponse> {
    return apiCall('/api/game/next', 'POST', request);
  },

  completePhase1(request: GameCompleteRequest): Promise<GameCompleteResponse> {
    return apiCall('/api/game/complete', 'POST', request);
  },

  getBehavioralConfig(sessionId: string): Promise<BehavioralConfig> {
    return apiCall(`/api/game/behavioral-config?session_id=${sessionId}`, 'GET');
  },

  submitBehavioralSignals(request: BehavioralSignalsRequest): Promise<{ signal_id: string }> {
    return apiCall('/api/game/behavioral-signals', 'POST', request);
  },

  computeBlendedScore(sessionId: string): Promise<BehavioralScoreResponse> {
    return apiCall('/api/game/behavioral-score', 'POST', { session_id: sessionId });
  },
};
