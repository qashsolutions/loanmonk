// ============================================================
// Session Management Utilities
// Session seed generation, industry selection, device fingerprint
// ============================================================

import { INDUSTRIES } from '../constants/index.js';

/**
 * Generate a unique session seed.
 * SHA-256 hash of (user_id + timestamp + random salt).
 * Used to ensure every assessment session is computationally unique.
 */
export async function generateSessionSeed(userId: string): Promise<string> {
  const raw = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Select a random industry for scenario generation.
 * Deterministic based on session seed for reproducibility.
 */
export function selectIndustry(sessionSeed: string): string {
  // Use first 8 chars of seed as a hex number for deterministic selection
  const seedNum = parseInt(sessionSeed.slice(0, 8), 16);
  const index = seedNum % INDUSTRIES.length;
  return INDUSTRIES[index];
}

/**
 * Hash an IP address for privacy-safe storage.
 */
export async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + ':creditmind-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
