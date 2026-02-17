// ============================================================
// Behavioral Signal Tracker
// Captures all raw behavioral data during Supply Run
// Feeds into Phase 2 scoring engine
// ============================================================

import type { CargoLoad, BankingEvent, PathRecord, LossEvent, SharingEvent } from '../../../../../lib/types/index.js';

export class SignalTracker {
  private gameSeed: string;
  private durationMs: number;
  private startTime = 0;

  // Raw signal arrays
  private tapTimestamps: number[] = [];
  private tapVelocities: number[] = [];
  private pathRecords: PathRecord[] = [];
  private bankingEvents: BankingEvent[] = [];
  private cargoLoads: CargoLoad[] = [];
  private lossEvents: LossEvent[] = [];
  private sharingEvents: SharingEvent[] = [];
  private multiOrderCounts: number[] = [];

  // Exploration
  private explorationTiles = 0;
  private totalTiles = 0;

  // Time tracking (crowd vs quiet zones)
  private crowdTimeMs = 0;
  private quietTimeMs = 0;

  // Previous state for delta calculations
  private prevBehaviorMetric = 0;

  constructor(gameSeed: string, durationMs: number) {
    this.gameSeed = gameSeed;
    this.durationMs = durationMs;
  }

  start(): void {
    this.startTime = Date.now();
  }

  private elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Record a tap event. Used to compute tap velocity (interval between taps).
   */
  recordTap(): void {
    const now = Date.now();
    this.tapTimestamps.push(now);

    if (this.tapTimestamps.length > 1) {
      const prevTap = this.tapTimestamps[this.tapTimestamps.length - 2];
      this.tapVelocities.push(now - prevTap);
    }
  }

  /**
   * Record a cargo load attempt (BART data).
   */
  recordCargoLoad(crates: number, tipped: boolean, reward: number, deliveryId: number): void {
    this.cargoLoads.push({ crates, tipped, reward, delivery_id: deliveryId });

    // Calculate behavior delta (change in average cargo after this load)
    const recentLoads = this.cargoLoads.slice(-3);
    const avgRecent = recentLoads.reduce((s, c) => s + c.crates, 0) / recentLoads.length;
    const delta = Math.abs(avgRecent - this.prevBehaviorMetric);
    this.prevBehaviorMetric = avgRecent;

    // If tipped, record as a loss event with behavior delta
    if (tipped) {
      this.lossEvents.push({
        type: 'tip_over',
        timestamp_ms: this.elapsed(),
        amount_lost: crates * 10,
        behavior_delta: Math.min(1, delta / 3), // Normalize to 0-1
      });
    }
  }

  /**
   * Record a path taken for a delivery.
   */
  recordPath(actualDist: number, optimalDist: number, deliveryId: number): void {
    this.pathRecords.push({
      actual_dist: actualDist,
      optimal_dist: optimalDist,
      delivery_id: deliveryId,
    });
  }

  /**
   * Record a banking event.
   */
  recordBanking(amount: number, balanceBefore: number): void {
    this.bankingEvents.push({
      timestamp_ms: this.elapsed(),
      amount,
      balance_before: balanceBefore,
    });
  }

  /**
   * Record a loss event (theft, penalty).
   */
  recordLoss(type: 'theft' | 'tip_over' | 'penalty', amountLost: number): void {
    // Calculate behavior delta based on tap velocity change after loss
    const recentVelocities = this.tapVelocities.slice(-5);
    const avgVelocity = recentVelocities.length > 0
      ? recentVelocities.reduce((s, v) => s + v, 0) / recentVelocities.length
      : 500;
    const normalizedDelta = Math.min(1, Math.abs(avgVelocity - 500) / 1000);

    this.lossEvents.push({
      type,
      timestamp_ms: this.elapsed(),
      amount_lost: amountLost,
      behavior_delta: normalizedDelta,
    });
  }

  /**
   * Record a sharing/help interaction.
   */
  recordSharing(offered: boolean, accepted: boolean, rewardSplit: number): void {
    this.sharingEvents.push({ offered, accepted, reward_split: rewardSplit });
  }

  /**
   * Record exploration data.
   */
  recordExploration(uniqueTiles: number, totalTiles: number): void {
    this.explorationTiles = Math.max(this.explorationTiles, uniqueTiles);
    this.totalTiles = totalTiles;
  }

  /**
   * Record time spent in crowd vs quiet zones.
   */
  addCrowdTime(ms: number): void {
    this.crowdTimeMs += ms;
  }

  addQuietTime(ms: number): void {
    this.quietTimeMs += ms;
  }

  /**
   * Record simultaneous order count.
   */
  recordMultiOrder(simultaneousCount: number): void {
    this.multiOrderCounts.push(simultaneousCount);
  }

  /**
   * Get all collected signals for submission.
   */
  getSignals() {
    return {
      game_seed: this.gameSeed,
      duration_ms: this.elapsed(),
      tap_velocities: this.tapVelocities,
      path_records: this.pathRecords,
      banking_events: this.bankingEvents,
      cargo_loads: this.cargoLoads,
      loss_events: this.lossEvents,
      sharing_events: this.sharingEvents,
      exploration_tiles: this.explorationTiles,
      total_tiles: this.totalTiles,
      crowd_time_ms: this.crowdTimeMs,
      quiet_time_ms: this.quietTimeMs,
      multi_order_counts: this.multiOrderCounts,
    };
  }
}
