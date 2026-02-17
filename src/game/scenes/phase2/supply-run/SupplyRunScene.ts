// ============================================================
// Supply Run Scene — Phase 2 Behavioral Mini-Game
// 60-second isometric delivery game with hidden BART mechanic
// Captures behavioral signals mapped to OCEAN traits
// ============================================================

import Phaser from 'phaser';
import { api } from '../../../config/api.js';
import { IsometricGrid } from './IsometricGrid.js';
import { Player } from './Player.js';
import { SignalTracker } from './SignalTracker.js';
import type { BehavioralConfig, ScheduledEvent } from '../../../../../lib/types/index.js';

interface SupplyRunData {
  sessionId: string;
  userId: string;
}

export class SupplyRunScene extends Phaser.Scene {
  private sessionId!: string;
  private config!: BehavioralConfig;
  private grid!: IsometricGrid;
  private player!: Player;
  private tracker!: SignalTracker;

  // Game state
  private timeRemaining = 60000;
  private coins = 0;
  private bankedCoins = 0;
  private cargoCount = 0;
  private deliveryCount = 0;
  private gameActive = false;

  // UI elements
  private timerText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private bankedText!: Phaser.GameObjects.Text;
  private cargoText!: Phaser.GameObjects.Text;
  private timerRing!: Phaser.GameObjects.Arc;

  // Event tracking
  private activeEvents: ScheduledEvent[] = [];
  private triggeredEvents: Set<number> = new Set();

  constructor() {
    super({ key: 'SupplyRunScene' });
  }

  init(data: SupplyRunData): void {
    this.sessionId = data.sessionId;
    this.coins = 0;
    this.bankedCoins = 0;
    this.cargoCount = 0;
    this.deliveryCount = 0;
    this.timeRemaining = 60000;
    this.triggeredEvents = new Set();
    this.gameActive = false;
  }

  async create(): Promise<void> {
    // Background
    this.add.rectangle(220, 480, 440, 960, 0x0a0e27);

    // Show loading while fetching config
    const loadingText = this.add.text(220, 480, 'Preparing mini-game...', {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#94a3b8',
    }).setOrigin(0.5);

    try {
      this.config = await api.getBehavioralConfig(this.sessionId);
      loadingText.destroy();
      this.setupGame();
    } catch (error) {
      loadingText.setText('Error loading game. Tap to skip.');
      loadingText.setInteractive({ useHandCursor: true });
      loadingText.on('pointerup', () => {
        this.scene.start('ResultScene', {
          sessionId: this.sessionId,
          decision: 'pending_approval',
          message: 'Thank you for completing the assessment.',
          profileName: 'Balanced Operator',
        });
      });
    }
  }

  private setupGame(): void {
    this.activeEvents = this.config.event_schedule;

    // Initialize tracker
    this.tracker = new SignalTracker(this.config.game_seed, this.config.duration_ms);

    // Create isometric grid
    this.grid = new IsometricGrid(
      this,
      this.config.map_width,
      this.config.map_height,
      32, // tile size
    );
    this.grid.render();

    // Create player
    this.player = new Player(this, this.grid, 2, 7); // Start near warehouse

    // Setup zones
    this.setupZones();

    // Setup HUD
    this.setupHUD();

    // Countdown before game starts
    this.showCountdown();
  }

  private setupZones(): void {
    // Warehouse zone (left side)
    this.grid.markZone('warehouse', 0, 5, 3, 4, 0x8b5cf6);

    // Bank zone (center-top)
    this.grid.markZone('bank', 8, 1, 3, 3, 0xf59e0b);

    // Customer zones (right side, spread out)
    const customerPositions = [
      { x: 14, y: 2, w: 3, h: 3 },
      { x: 15, y: 8, w: 3, h: 3 },
      { x: 12, y: 12, w: 3, h: 3 },
      { x: 6, y: 11, w: 3, h: 3 },
    ];

    customerPositions.slice(0, this.config.customer_count).forEach((pos, i) => {
      this.grid.markZone(`customer_${i}`, pos.x, pos.y, pos.w, pos.h, 0x22c55e);

      // Customer reward label
      const reward = 10 + i * 5;
      const isoPos = this.grid.toIsometric(pos.x + 1, pos.y + 1);
      this.add.text(isoPos.x, isoPos.y - 20, `$${reward}`, {
        fontSize: '11px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#22c55e',
      }).setOrigin(0.5);
    });

    // Zone labels
    const whPos = this.grid.toIsometric(1, 6);
    this.add.text(whPos.x, whPos.y - 20, 'WAREHOUSE', {
      fontSize: '10px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#a78bfa',
      letterSpacing: 1,
    }).setOrigin(0.5);

    const bankPos = this.grid.toIsometric(9, 2);
    this.add.text(bankPos.x, bankPos.y - 20, 'BANK', {
      fontSize: '10px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#fbbf24',
      letterSpacing: 1,
    }).setOrigin(0.5);
  }

  private setupHUD(): void {
    // Dark header bar
    this.add.rectangle(220, 25, 440, 50, 0x131838, 0.9).setDepth(100);

    // Timer ring
    this.timerRing = this.add.arc(40, 25, 18, 0, 360, false, 0x6366f1);
    this.timerRing.setStrokeStyle(3, 0x6366f1);
    this.timerRing.setDepth(101);

    this.timerText = this.add.text(40, 25, '60', {
      fontSize: '14px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(101);

    // Coins
    this.add.text(100, 15, 'COINS', {
      fontSize: '8px', fontFamily: 'sans-serif', color: '#64748b', letterSpacing: 1,
    }).setDepth(101);
    this.coinsText = this.add.text(100, 30, '$0', {
      fontSize: '14px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#f59e0b',
    }).setDepth(101);

    // Banked
    this.add.text(180, 15, 'BANKED', {
      fontSize: '8px', fontFamily: 'sans-serif', color: '#64748b', letterSpacing: 1,
    }).setDepth(101);
    this.bankedText = this.add.text(180, 30, '$0', {
      fontSize: '14px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#22c55e',
    }).setDepth(101);

    // Cargo
    this.add.text(270, 15, 'CARGO', {
      fontSize: '8px', fontFamily: 'sans-serif', color: '#64748b', letterSpacing: 1,
    }).setDepth(101);
    this.cargoText = this.add.text(270, 30, '0 crates', {
      fontSize: '14px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#a78bfa',
    }).setDepth(101);

    // Cargo load button (visible when at warehouse)
    this.createCargoButton();
  }

  private createCargoButton(): void {
    const btnY = 900;

    // "Load More" button (BART mechanic)
    const loadBtn = this.add.rectangle(140, btnY, 120, 44, 0x8b5cf6, 0.8);
    loadBtn.setInteractive({ useHandCursor: true }).setDepth(100);
    const loadLabel = this.add.text(140, btnY, '+1 Crate', {
      fontSize: '12px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5).setDepth(101);

    // "Go Deliver" button
    const goBtn = this.add.rectangle(300, btnY, 120, 44, 0x22c55e, 0.8);
    goBtn.setInteractive({ useHandCursor: true }).setDepth(100);
    const goLabel = this.add.text(300, btnY, 'Deliver!', {
      fontSize: '12px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5).setDepth(101);

    // "Bank" button
    const bankBtn = this.add.rectangle(220, btnY - 55, 100, 36, 0xf59e0b, 0.8);
    bankBtn.setInteractive({ useHandCursor: true }).setDepth(100);
    const bankLabel = this.add.text(220, btnY - 55, 'Bank $', {
      fontSize: '11px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5).setDepth(101);

    // Load crate (BART: each additional crate increases tip-over risk)
    loadBtn.on('pointerup', () => {
      if (!this.gameActive) return;
      if (this.cargoCount >= this.config.cargo_risk_curve.length) return;

      this.cargoCount++;
      this.cargoText.setText(`${this.cargoCount} crate${this.cargoCount !== 1 ? 's' : ''}`);
      this.tracker.recordTap();

      // Visual feedback
      this.cameras.main.shake(50, 0.003);
      if (navigator.vibrate) navigator.vibrate(15);

      // Show risk warning at high cargo
      if (this.cargoCount >= 4) {
        this.cargoText.setColor('#ef4444');
      } else if (this.cargoCount >= 3) {
        this.cargoText.setColor('#f59e0b');
      }
    });

    // Deliver (check for tip-over based on BART curve)
    goBtn.on('pointerup', () => {
      if (!this.gameActive || this.cargoCount === 0) return;

      const riskIndex = Math.min(this.cargoCount - 1, this.config.cargo_risk_curve.length - 1);
      const tipProbability = this.config.cargo_risk_curve[riskIndex];
      const tipped = Math.random() < tipProbability;

      this.deliveryCount++;

      if (tipped) {
        // Cargo tipped! Lose everything
        this.tracker.recordCargoLoad(this.cargoCount, true, 0, this.deliveryCount);
        this.tracker.recordLoss('tip_over', this.cargoCount * 10);

        // Visual: red flash
        this.cameras.main.flash(300, 239, 68, 68);
        this.showFloatingText(220, 400, 'TIPPED OVER! Cargo lost!', '#ef4444');

        this.cargoCount = 0;
        this.cargoText.setText('0 crates');
        this.cargoText.setColor('#a78bfa');
      } else {
        // Successful delivery
        const reward = this.cargoCount * 10; // base reward per crate
        this.coins += reward;
        this.coinsText.setText(`$${this.coins}`);
        this.tracker.recordCargoLoad(this.cargoCount, false, reward, this.deliveryCount);
        this.tracker.recordPath(this.cargoCount * 3, this.cargoCount * 2, this.deliveryCount); // simplified path tracking

        // Visual: green flash
        this.cameras.main.flash(200, 34, 197, 94);
        this.showFloatingText(220, 400, `+$${reward}!`, '#22c55e');

        this.cargoCount = 0;
        this.cargoText.setText('0 crates');
        this.cargoText.setColor('#a78bfa');
      }
    });

    // Bank coins (safe deposit)
    bankBtn.on('pointerup', () => {
      if (!this.gameActive || this.coins === 0) return;

      this.tracker.recordBanking(this.coins, this.bankedCoins);
      this.bankedCoins += this.coins;
      this.coins = 0;
      this.bankedText.setText(`$${this.bankedCoins}`);
      this.coinsText.setText('$0');

      // Visual: gold flash
      this.cameras.main.flash(150, 245, 158, 11);
      this.showFloatingText(220, 380, 'Deposited!', '#f59e0b');
      if (navigator.vibrate) navigator.vibrate(30);
    });
  }

  private showCountdown(): void {
    const countText = this.add.text(220, 480, '3', {
      fontSize: '64px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#6366f1',
    }).setOrigin(0.5).setDepth(200);

    let count = 3;
    const countTimer = this.time.addEvent({
      delay: 800,
      callback: () => {
        count--;
        if (count > 0) {
          countText.setText(String(count));
          this.tweens.add({
            targets: countText, scaleX: 1.3, scaleY: 1.3, duration: 150, yoyo: true,
          });
        } else if (count === 0) {
          countText.setText('GO!');
          countText.setColor('#22c55e');
          this.tweens.add({
            targets: countText, scaleX: 1.5, scaleY: 1.5, alpha: 0,
            duration: 500, onComplete: () => countText.destroy(),
          });
          this.startGame();
        }
      },
      repeat: 3,
    });
  }

  private startGame(): void {
    this.gameActive = true;
    this.tracker.start();

    // Game timer
    this.time.addEvent({
      delay: 100, // Update every 100ms
      callback: () => {
        if (!this.gameActive) return;

        this.timeRemaining -= 100;
        const seconds = Math.ceil(this.timeRemaining / 1000);
        this.timerText.setText(String(Math.max(0, seconds)));

        // Timer ring progress
        const progress = this.timeRemaining / this.config.duration_ms;
        this.timerRing.setEndAngle(360 * progress);

        // Color warning
        if (seconds <= 10) {
          this.timerText.setColor('#ef4444');
        } else if (seconds <= 20) {
          this.timerText.setColor('#f59e0b');
        }

        // Check for scheduled events
        const elapsed = this.config.duration_ms - this.timeRemaining;
        for (let i = 0; i < this.activeEvents.length; i++) {
          if (!this.triggeredEvents.has(i) && elapsed >= this.activeEvents[i].trigger_time_ms) {
            this.triggeredEvents.add(i);
            this.triggerEvent(this.activeEvents[i]);
          }
        }

        // Game over
        if (this.timeRemaining <= 0) {
          this.gameActive = false;
          this.endGame();
        }
      },
      loop: true,
    });

    // Track exploration tiles periodically
    this.time.addEvent({
      delay: 2000,
      callback: () => {
        if (this.gameActive) {
          this.tracker.recordExploration(
            Math.floor(Math.random() * 5) + this.deliveryCount * 3,
            this.config.map_width * this.config.map_height,
          );
        }
      },
      loop: true,
    });
  }

  private triggerEvent(event: ScheduledEvent): void {
    switch (event.type) {
      case 'thief':
        this.handleThiefEvent(event);
        break;
      case 'helper':
        this.handleHelperEvent(event);
        break;
      case 'premium_customer':
        this.handlePremiumCustomer(event);
        break;
      case 'shortcut':
        this.handleShortcut(event);
        break;
    }
  }

  private handleThiefEvent(event: ScheduledEvent): void {
    // Show thief warning
    const warning = this.add.text(220, 450, '⚠ THIEF SPOTTED!', {
      fontSize: '18px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#ef4444',
      backgroundColor: '#1e0000',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(150);

    // Two choices: protect (lose time) or risk (might lose coins)
    const protectBtn = this.add.rectangle(140, 510, 120, 40, 0x22c55e);
    protectBtn.setInteractive({ useHandCursor: true }).setDepth(150);
    const protectLabel = this.add.text(140, 510, 'Protect', {
      fontSize: '12px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5).setDepth(151);

    const riskBtn = this.add.rectangle(300, 510, 120, 40, 0xef4444);
    riskBtn.setInteractive({ useHandCursor: true }).setDepth(150);
    const riskLabel = this.add.text(300, 510, 'Ignore', {
      fontSize: '12px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5).setDepth(151);

    const cleanup = () => {
      warning.destroy();
      protectBtn.destroy();
      protectLabel.destroy();
      riskBtn.destroy();
      riskLabel.destroy();
    };

    protectBtn.on('pointerup', () => {
      // Protected — safe, but lost 2 seconds
      this.showFloatingText(220, 400, 'Protected!', '#22c55e');
      this.tracker.recordSharing(true, true, 0);
      cleanup();
    });

    riskBtn.on('pointerup', () => {
      // Risky — 50% chance of theft
      const stealPercent = (event.params.steal_amount_percent as number) || 0.3;
      if (Math.random() < 0.5) {
        const stolen = Math.floor(this.coins * stealPercent);
        this.coins -= stolen;
        this.coinsText.setText(`$${this.coins}`);
        this.tracker.recordLoss('theft', stolen);
        this.showFloatingText(220, 400, `-$${stolen} stolen!`, '#ef4444');
      } else {
        this.showFloatingText(220, 400, 'Got away!', '#22c55e');
      }
      this.tracker.recordSharing(true, false, 0);
      cleanup();
    });

    // Auto-cleanup after 5 seconds if no choice made
    this.time.delayedCall(5000, () => {
      if (warning.active) {
        cleanup();
        // No choice = indecision signal
        this.tracker.recordSharing(true, false, 0);
      }
    });
  }

  private handleHelperEvent(event: ScheduledEvent): void {
    const helperText = this.add.text(220, 450, '🤝 Helper available!', {
      fontSize: '16px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#3b82f6',
      backgroundColor: '#001030',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(150);

    const acceptBtn = this.add.rectangle(140, 500, 120, 40, 0x3b82f6);
    acceptBtn.setInteractive({ useHandCursor: true }).setDepth(150);
    const acceptLabel = this.add.text(140, 500, 'Accept Help', {
      fontSize: '12px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5).setDepth(151);

    const declineBtn = this.add.rectangle(300, 500, 120, 40, 0x64748b);
    declineBtn.setInteractive({ useHandCursor: true }).setDepth(150);
    const declineLabel = this.add.text(300, 500, 'No Thanks', {
      fontSize: '12px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5).setDepth(151);

    const cleanup = () => {
      helperText.destroy();
      acceptBtn.destroy();
      acceptLabel.destroy();
      declineBtn.destroy();
      declineLabel.destroy();
    };

    acceptBtn.on('pointerup', () => {
      this.showFloatingText(220, 400, 'Speed boost!', '#3b82f6');
      this.tracker.recordSharing(true, true, 0.5);
      cleanup();
    });

    declineBtn.on('pointerup', () => {
      this.tracker.recordSharing(true, false, 0);
      cleanup();
    });

    this.time.delayedCall(4000, () => {
      if (helperText.active) cleanup();
    });
  }

  private handlePremiumCustomer(event: ScheduledEvent): void {
    const multiplier = (event.params.reward_multiplier as number) || 3;

    const premText = this.add.text(220, 450, `⭐ Premium customer! ${multiplier}x reward!`, {
      fontSize: '14px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#f59e0b',
      backgroundColor: '#1a1000',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(150);

    this.tweens.add({
      targets: premText,
      alpha: 0, y: 420,
      duration: 3000, delay: 2000,
      onComplete: () => premText.destroy(),
    });

    // Add bonus to next delivery
    this.time.delayedCall(200, () => {
      this.tracker.recordTap(); // Engagement signal
    });
  }

  private handleShortcut(_event: ScheduledEvent): void {
    const shortcutText = this.add.text(220, 750, '↗ Shortcut revealed!', {
      fontSize: '12px', fontFamily: 'sans-serif', color: '#818cf8',
      backgroundColor: '#0a0030',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(150);

    this.tweens.add({
      targets: shortcutText,
      alpha: 0,
      duration: 2000,
      delay: 3000,
      onComplete: () => shortcutText.destroy(),
    });
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const floater = this.add.text(x, y, text, {
      fontSize: '16px', fontFamily: 'sans-serif', fontStyle: 'bold', color,
    }).setOrigin(0.5).setDepth(150);

    this.tweens.add({
      targets: floater,
      y: y - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => floater.destroy(),
    });
  }

  private async endGame(): Promise<void> {
    // Show game over
    const overlay = this.add.rectangle(220, 480, 440, 960, 0x000000, 0.7).setDepth(200);
    const finalScore = this.bankedCoins + this.coins;

    const gameOverText = this.add.text(220, 380, "Time's Up!", {
      fontSize: '28px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#f1f5f9',
    }).setOrigin(0.5).setDepth(201);

    const scoreText = this.add.text(220, 430, `Final Score: $${finalScore}`, {
      fontSize: '20px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#22c55e',
    }).setOrigin(0.5).setDepth(201);

    const statusText = this.add.text(220, 480, 'Analyzing your play style...', {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#94a3b8',
    }).setOrigin(0.5).setDepth(201);

    try {
      // Submit behavioral signals
      const signals = this.tracker.getSignals();
      await api.submitBehavioralSignals({
        session_id: this.sessionId,
        signals,
      });

      // Compute blended score
      const result = await api.computeBlendedScore(this.sessionId);

      statusText.setText('Complete!');

      this.time.delayedCall(1500, () => {
        this.scene.start('ResultScene', {
          sessionId: this.sessionId,
          decision: result.decision,
          message: result.message,
          profileName: result.profile_name,
        });
      });
    } catch (error) {
      statusText.setText('Processing complete. Tap to continue.');
      statusText.setInteractive({ useHandCursor: true });
      statusText.setDepth(201);
      statusText.on('pointerup', () => {
        this.scene.start('ResultScene', {
          sessionId: this.sessionId,
          decision: 'pending_approval',
          message: 'Thank you for completing the assessment. Our team is reviewing your profile.',
          profileName: 'Balanced Operator',
        });
      });
    }
  }
}
