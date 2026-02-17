// ============================================================
// Phase 2 Behavioral Score Computation
// Converts raw Supply Run game signals into 0-1 normalized OCEAN scores
// ============================================================

import type { BehavioralSignals, NormalizedOceanScores, CargoLoad, PathRecord, BankingEvent } from '../types/index.js';
import { SUPPLY_RUN_CONFIG } from '../constants/index.js';

/**
 * Compute behavioral Conscientiousness (bC) from:
 * - Path efficiency: ratio of optimal to actual path distances
 * - Banking regularity: consistency of banking behavior
 * - Tap deliberation: response time patterns (deliberate > impulsive)
 */
export function computeBehavioralC(signals: BehavioralSignals): number {
  const pathEfficiency = computePathEfficiency(signals.path_records);
  const bankingRegularity = computeBankingRegularity(signals.banking_events, signals.duration_ms);
  const tapDeliberation = computeTapDeliberation(signals.tap_velocities);

  // Weighted combination: path efficiency (40%), banking (35%), deliberation (25%)
  return clamp01(0.40 * pathEfficiency + 0.35 * bankingRegularity + 0.25 * tapDeliberation);
}

/**
 * Compute behavioral Neuroticism (bN) from:
 * - Post-loss behavior change: how much behavior shifts after losing cargo/coins
 * - Hesitation patterns: variability in response times
 * - Inverse BART score: low risk-taking correlates with high neuroticism
 */
export function computeBehavioralN(signals: BehavioralSignals): number {
  const postLossChange = computePostLossChange(signals.loss_events, signals.tap_velocities);
  const hesitationPattern = computeHesitationPattern(signals.tap_velocities);
  const inverseBart = 1 - computeBartScore(signals.cargo_loads);

  // Weighted combination
  return clamp01(0.40 * postLossChange + 0.30 * hesitationPattern + 0.30 * inverseBart);
}

/**
 * Compute behavioral Agreeableness (bA) from:
 * - Sharing rate: frequency of sharing opportunities accepted
 * - Tip rate: whether user tips/rewards helpers
 * - Help acceptance: willingness to accept help from NPCs
 */
export function computeBehavioralA(signals: BehavioralSignals): number {
  const sharingRate = computeSharingRate(signals.sharing_events);
  const tipRate = computeTipRate(signals.sharing_events);
  const helpAcceptance = computeHelpAcceptance(signals.sharing_events);

  return clamp01(0.40 * sharingRate + 0.30 * tipRate + 0.30 * helpAcceptance);
}

/**
 * Compute behavioral Openness (bO) from:
 * - Exploration rate: unique tiles visited / total tiles
 * - Shortcut usage: willingness to try new paths
 * - BART score: risk-taking propensity (direct correlation with openness)
 */
export function computeBehavioralO(signals: BehavioralSignals): number {
  const explorationRate = signals.total_tiles > 0
    ? signals.exploration_tiles / signals.total_tiles
    : 0;
  const shortcutUsage = computeShortcutUsage(signals.path_records);
  const bartScore = computeBartScore(signals.cargo_loads);

  return clamp01(0.35 * explorationRate + 0.30 * shortcutUsage + 0.35 * bartScore);
}

/**
 * Compute behavioral Extraversion (bE) from:
 * - Crowd affinity: time spent in high-NPC zones vs quiet zones
 * - Multi-order rate: tendency to take on multiple deliveries simultaneously
 */
export function computeBehavioralE(signals: BehavioralSignals): number {
  const totalTime = signals.crowd_time_ms + signals.quiet_time_ms;
  const crowdAffinity = totalTime > 0 ? signals.crowd_time_ms / totalTime : 0.5;
  const multiOrderRate = computeMultiOrderRate(signals.multi_order_counts);

  return clamp01(0.55 * crowdAffinity + 0.45 * multiOrderRate);
}

/**
 * Compute all 5 behavioral trait scores from raw signals.
 */
export function computeAllBehavioralScores(signals: BehavioralSignals): NormalizedOceanScores {
  return {
    C: computeBehavioralC(signals),
    N: computeBehavioralN(signals),
    A: computeBehavioralA(signals),
    O: computeBehavioralO(signals),
    E: computeBehavioralE(signals),
  };
}

/**
 * Compute BART score: average crates loaded on non-tipped deliveries.
 * Higher = more risk-taking. Normalized to 0-1 (max 7 crates).
 */
export function computeBartScore(cargoLoads: CargoLoad[]): number {
  const successful = cargoLoads.filter(c => !c.tipped);
  if (successful.length === 0) return 0.5; // neutral if no data
  const avgCrates = successful.reduce((sum, c) => sum + c.crates, 0) / successful.length;
  return clamp01(avgCrates / SUPPLY_RUN_CONFIG.max_cargo);
}

// --- Internal Signal Computations ---

function computePathEfficiency(paths: PathRecord[]): number {
  if (paths.length === 0) return 0.5;
  const efficiencies = paths.map(p =>
    p.actual_dist > 0 ? Math.min(1, p.optimal_dist / p.actual_dist) : 0
  );
  return efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length;
}

function computeBankingRegularity(events: BankingEvent[], totalDuration: number): number {
  if (events.length < 2) return events.length === 1 ? 0.5 : 0.2;

  // Measure regularity as inverse of coefficient of variation of banking intervals
  const intervals: number[] = [];
  for (let i = 1; i < events.length; i++) {
    intervals.push(events[i].timestamp_ms - events[i - 1].timestamp_ms);
  }

  const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
  if (mean === 0) return 0.5;
  const std = Math.sqrt(
    intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length
  );
  const cv = std / mean; // coefficient of variation

  // Low CV = regular banking = high conscientiousness
  // CV of 0 = perfectly regular = 1.0, CV > 2 = very irregular = 0.0
  return clamp01(1 - cv / 2);
}

function computeTapDeliberation(velocities: number[]): number {
  if (velocities.length === 0) return 0.5;

  // Moderate tap speeds indicate deliberation (not too fast = impulsive, not too slow = indecisive)
  // Normalize: optimal tap interval ~400-800ms
  const avgInterval = velocities.reduce((s, v) => s + v, 0) / velocities.length;

  if (avgInterval < 200) return 0.2;  // Very impulsive
  if (avgInterval < 400) return 0.5;  // Somewhat quick
  if (avgInterval < 800) return 0.9;  // Deliberate
  if (avgInterval < 1200) return 0.7; // Somewhat slow
  return 0.4;                          // Very hesitant
}

function computePostLossChange(lossEvents: { behavior_delta: number }[], velocities: number[]): number {
  if (lossEvents.length === 0) return 0.3; // No losses = slight positive signal

  // Average absolute behavior delta after losses
  // High delta = high emotional reactivity = high neuroticism
  const avgDelta = lossEvents.reduce((s, e) => s + Math.abs(e.behavior_delta), 0) / lossEvents.length;
  return clamp01(avgDelta); // Already 0-1 normalized by game engine
}

function computeHesitationPattern(velocities: number[]): number {
  if (velocities.length < 3) return 0.5;

  // High variance in tap intervals = hesitation = neuroticism
  const mean = velocities.reduce((s, v) => s + v, 0) / velocities.length;
  const std = Math.sqrt(
    velocities.reduce((s, v) => s + (v - mean) ** 2, 0) / velocities.length
  );
  const cv = mean > 0 ? std / mean : 0;

  return clamp01(cv / 1.5); // Normalize: CV > 1.5 = max neuroticism signal
}

function computeSharingRate(events: { offered: boolean; accepted: boolean }[]): number {
  if (events.length === 0) return 0.5;
  const accepted = events.filter(e => e.offered && e.accepted).length;
  const offered = events.filter(e => e.offered).length;
  return offered > 0 ? accepted / offered : 0.5;
}

function computeTipRate(events: { reward_split: number }[]): number {
  if (events.length === 0) return 0.5;
  // Average reward split: 0 = kept everything, 1 = gave everything
  const avgSplit = events.reduce((s, e) => s + e.reward_split, 0) / events.length;
  return clamp01(avgSplit);
}

function computeHelpAcceptance(events: { offered: boolean; accepted: boolean }[]): number {
  if (events.length === 0) return 0.5;
  const helpOffered = events.filter(e => e.offered);
  if (helpOffered.length === 0) return 0.5;
  const accepted = helpOffered.filter(e => e.accepted).length;
  return accepted / helpOffered.length;
}

function computeShortcutUsage(paths: PathRecord[]): number {
  if (paths.length === 0) return 0.5;
  // If actual distance < optimal distance, they found a shortcut
  const shortcuts = paths.filter(p => p.actual_dist < p.optimal_dist * 0.95).length;
  return clamp01(shortcuts / paths.length);
}

function computeMultiOrderRate(counts: number[]): number {
  if (counts.length === 0) return 0.5;
  // Ratio of multi-order deliveries (>1 simultaneous) to total
  const multi = counts.filter(c => c > 1).length;
  return multi / counts.length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
