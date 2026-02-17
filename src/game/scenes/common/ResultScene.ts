// ============================================================
// ResultScene — Final user-facing result
// Shows ONLY "Approved" or "Pending Approval"
// Never shows PD score, trait scores, or denial
// ============================================================

import Phaser from 'phaser';

interface ResultData {
  sessionId: string;
  decision: 'approved' | 'pending_approval';
  message: string;
  profileName: string;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: ResultData): void {
    const { decision, message, profileName } = data;

    // Background
    this.add.rectangle(220, 480, 440, 960, 0x0a0e27);

    if (decision === 'approved') {
      this.showApproved(message, profileName);
    } else {
      this.showPending(message, profileName);
    }
  }

  private showApproved(message: string, profileName: string): void {
    // Confetti particles
    const emitter = this.add.particles(220, -20, 'particle', {
      speed: { min: 50, max: 200 },
      angle: { min: 60, max: 120 },
      gravityY: 150,
      lifespan: 4000,
      quantity: 2,
      frequency: 50,
      tint: [0x22c55e, 0x6366f1, 0xf59e0b, 0x3b82f6, 0xa855f7],
      scale: { start: 1.5, end: 0.5 },
      emitting: true,
    });

    // Success icon (checkmark circle)
    const iconBg = this.add.circle(220, 320, 50, 0x22c55e, 0.2);
    iconBg.setStrokeStyle(3, 0x22c55e);

    const checkmark = this.add.text(220, 320, '✓', {
      fontSize: '48px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5);

    // Pulse animation
    this.tweens.add({
      targets: iconBg,
      scaleX: 1.1, scaleY: 1.1,
      duration: 800, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title
    this.add.text(220, 410, 'Approved!', {
      fontSize: '32px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5);

    // Message
    this.add.text(220, 470, message, {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
      wordWrap: { width: 340 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0);

    // Profile card
    this.renderProfileCard(profileName, 570);

    // Stop confetti after 5 seconds
    this.time.delayedCall(5000, () => {
      emitter.stop();
    });
  }

  private showPending(message: string, profileName: string): void {
    // Hourglass animation
    const iconBg = this.add.circle(220, 320, 50, 0x3b82f6, 0.2);
    iconBg.setStrokeStyle(3, 0x3b82f6);

    const hourglass = this.add.text(220, 320, '⏳', {
      fontSize: '40px',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Rotate hourglass
    this.tweens.add({
      targets: hourglass,
      angle: 180,
      duration: 2000,
      repeat: -1,
      ease: 'Cubic.easeInOut',
      yoyo: true,
    });

    // Title
    this.add.text(220, 410, 'Pending Approval', {
      fontSize: '28px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#3b82f6',
    }).setOrigin(0.5);

    // Message
    this.add.text(220, 470, message, {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
      wordWrap: { width: 340 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0);

    // Profile card
    this.renderProfileCard(profileName, 570);
  }

  private renderProfileCard(profileName: string, y: number): void {
    // "Your Business Mindset Profile" card
    const cardBg = this.add.rectangle(220, y + 40, 360, 120, 0x1e2952, 0.6);
    cardBg.setStrokeStyle(1, 0x334155);

    this.add.text(220, y + 5, 'Your Business Mindset Profile', {
      fontSize: '11px',
      fontFamily: 'sans-serif',
      color: '#64748b',
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.add.text(220, y + 35, profileName, {
      fontSize: '22px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#f1f5f9',
    }).setOrigin(0.5);

    // Decorative line
    this.add.rectangle(220, y + 60, 60, 2, 0x6366f1);

    this.add.text(220, y + 75, 'This profile reflects your natural business decision-making style.', {
      fontSize: '11px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
      wordWrap: { width: 300 },
      align: 'center',
    }).setOrigin(0.5, 0);
  }
}
