// ============================================================
// Type 2: Priority Bars (Vertical Bar Tap)
// Five vertical bars of varying height representing a spectrum
// User taps the bar matching their position
// Measures: All traits depending on context
// ============================================================

import Phaser from 'phaser';
import type { GeneratedQuestion } from '../../../../../lib/types/index.js';

const BAR_COUNT = 5;
const BAR_WIDTH = 56;
const BAR_GAP = 16;
const BAR_START_X = 44;
const BAR_BOTTOM_Y = 560;
const BAR_HEIGHTS = [100, 160, 220, 280, 340]; // Increasing heights
const BAR_COLORS = [0x3b82f6, 0x6366f1, 0x8b5cf6, 0xa855f7, 0xd946ef]; // Blue → Purple gradient

export function renderBarsQuestion(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  question: GeneratedQuestion,
  onAnswer: (optionIndex: number, score: number) => void,
): void {
  // Question text
  const questionText = scene.add.text(220, 140, question.text_clue, {
    fontSize: '18px',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    color: '#f1f5f9',
    wordWrap: { width: 380 },
    align: 'center',
  }).setOrigin(0.5, 0);
  container.add(questionText);

  // Visual description
  const descText = scene.add.text(220, 185, question.visual_description.slice(0, 100), {
    fontSize: '11px',
    fontFamily: 'sans-serif',
    color: '#64748b',
    wordWrap: { width: 380 },
    align: 'center',
  }).setOrigin(0.5, 0);
  container.add(descText);

  // Spectrum labels (first and last only, per spec)
  const options = question.options.slice(0, BAR_COUNT);
  if (options.length > 0) {
    const leftLabel = scene.add.text(BAR_START_X + BAR_WIDTH / 2, BAR_BOTTOM_Y + 30, options[0].label, {
      fontSize: '11px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
      wordWrap: { width: 80 },
      align: 'center',
    }).setOrigin(0.5, 0);
    container.add(leftLabel);
  }

  if (options.length > 1) {
    const lastIdx = options.length - 1;
    const rightX = BAR_START_X + lastIdx * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2;
    const rightLabel = scene.add.text(rightX, BAR_BOTTOM_Y + 30, options[lastIdx].label, {
      fontSize: '11px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
      wordWrap: { width: 80 },
      align: 'center',
    }).setOrigin(0.5, 0);
    container.add(rightLabel);
  }

  // Render bars
  for (let i = 0; i < Math.min(options.length, BAR_COUNT); i++) {
    const x = BAR_START_X + i * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2;
    const height = BAR_HEIGHTS[i];
    const y = BAR_BOTTOM_Y - height / 2;

    // Bar background (darker)
    const barBg = scene.add.rectangle(x, BAR_BOTTOM_Y - height / 2, BAR_WIDTH, height, BAR_COLORS[i], 0.3);
    barBg.setStrokeStyle(2, BAR_COLORS[i], 0.5);
    barBg.setInteractive({ useHandCursor: true });
    container.add(barBg);

    // Bar value indicator at top
    const valueCircle = scene.add.circle(x, BAR_BOTTOM_Y - height + 12, 14, BAR_COLORS[i], 0.6);
    container.add(valueCircle);

    const valueText = scene.add.text(x, BAR_BOTTOM_Y - height + 12, String(i + 1), {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(valueText);

    // Gradient fill effect (from bottom)
    const fill = scene.add.rectangle(x, BAR_BOTTOM_Y, BAR_WIDTH - 4, 0, BAR_COLORS[i], 0.2);
    fill.setOrigin(0.5, 1);
    container.add(fill);

    // Animate fill on load
    scene.tweens.add({
      targets: fill,
      height: height - 4,
      duration: 500,
      delay: i * 80,
      ease: 'Cubic.easeOut',
    });

    // Hover
    barBg.on('pointerover', () => {
      barBg.setFillStyle(BAR_COLORS[i], 0.5);
      scene.tweens.add({ targets: barBg, scaleX: 1.08, duration: 80 });
    });

    barBg.on('pointerout', () => {
      barBg.setFillStyle(BAR_COLORS[i], 0.3);
      scene.tweens.add({ targets: barBg, scaleX: 1, duration: 80 });
    });

    // Selection
    barBg.on('pointerup', () => {
      // Flash the selected bar
      barBg.setFillStyle(BAR_COLORS[i], 0.8);
      scene.tweens.add({
        targets: barBg,
        scaleX: 0.9,
        scaleY: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          onAnswer(i, options[i].score);
        },
      });
    });
  }

  // Color gradient legend
  const legendLine = scene.add.rectangle(220, BAR_BOTTOM_Y + 18, 360, 3, 0xffffff, 0.1);
  container.add(legendLine);

  // Instruction
  const instruction = scene.add.text(220, BAR_BOTTOM_Y + 80, 'Tap the bar that matches your position', {
    fontSize: '12px',
    fontFamily: 'sans-serif',
    color: '#64748b',
    fontStyle: 'italic',
  }).setOrigin(0.5);
  container.add(instruction);
}
