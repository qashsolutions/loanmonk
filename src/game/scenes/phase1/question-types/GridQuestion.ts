// ============================================================
// Type 1: Scenario Cards (2x2 Grid Tap)
// Four illustrated cards showing business scenarios
// User taps the one that matches their instinct
// Measures: Primarily C and N
// ============================================================

import Phaser from 'phaser';
import type { GeneratedQuestion } from '../../../../../lib/types/index.js';

const CARD_COLORS = [0x22c55e, 0xef4444, 0x3b82f6, 0xf59e0b]; // green, red, blue, amber
const CARD_WIDTH = 180;
const CARD_HEIGHT = 160;
const GRID_START_X = 30;
const GRID_START_Y = 160;
const GRID_GAP = 20;

export function renderGridQuestion(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  question: GeneratedQuestion,
  onAnswer: (optionIndex: number, score: number) => void,
): void {
  // Question text
  const questionText = scene.add.text(220, 130, question.text_clue, {
    fontSize: '18px',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    color: '#f1f5f9',
    wordWrap: { width: 380 },
    align: 'center',
  }).setOrigin(0.5, 0);
  container.add(questionText);

  // Visual description hint
  const hintText = scene.add.text(220, 170, question.visual_description.slice(0, 80), {
    fontSize: '11px',
    fontFamily: 'sans-serif',
    color: '#64748b',
    wordWrap: { width: 380 },
    align: 'center',
  }).setOrigin(0.5, 0);
  container.add(hintText);

  // Render 2x2 grid of cards
  const options = question.options.slice(0, 4);
  const startY = 220;

  options.forEach((option, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = GRID_START_X + col * (CARD_WIDTH + GRID_GAP) + CARD_WIDTH / 2;
    const y = startY + row * (CARD_HEIGHT + GRID_GAP) + CARD_HEIGHT / 2;

    // Card background
    const cardBg = scene.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, 0x1e2952, 0.8);
    cardBg.setStrokeStyle(2, CARD_COLORS[index], 0.6);
    cardBg.setInteractive({ useHandCursor: true });
    container.add(cardBg);

    // Color indicator strip at top
    const strip = scene.add.rectangle(x, y - CARD_HEIGHT / 2 + 4, CARD_WIDTH - 4, 8, CARD_COLORS[index]);
    container.add(strip);

    // Icon circle (color-coded)
    const icon = scene.add.circle(x, y - 20, 22, CARD_COLORS[index], 0.3);
    icon.setStrokeStyle(2, CARD_COLORS[index], 0.8);
    container.add(icon);

    // Icon letter
    const iconLetter = scene.add.text(x, y - 20, String.fromCharCode(65 + index), {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(iconLetter);

    // Option label
    const label = scene.add.text(x, y + 25, option.label, {
      fontSize: '12px',
      fontFamily: 'sans-serif',
      color: '#e2e8f0',
      wordWrap: { width: CARD_WIDTH - 20 },
      align: 'center',
    }).setOrigin(0.5, 0);
    container.add(label);

    // Visual hint text
    if (option.visual_hint) {
      const hint = scene.add.text(x, y + 60, option.visual_hint, {
        fontSize: '10px',
        fontFamily: 'sans-serif',
        color: '#64748b',
        wordWrap: { width: CARD_WIDTH - 20 },
        align: 'center',
      }).setOrigin(0.5, 0);
      container.add(hint);
    }

    // Hover effect
    cardBg.on('pointerover', () => {
      scene.tweens.add({
        targets: cardBg,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 100,
      });
      cardBg.setStrokeStyle(3, CARD_COLORS[index], 1);
    });

    cardBg.on('pointerout', () => {
      scene.tweens.add({
        targets: cardBg,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
      cardBg.setStrokeStyle(2, CARD_COLORS[index], 0.6);
    });

    // Selection
    cardBg.on('pointerup', () => {
      // Highlight selected card
      cardBg.setFillStyle(CARD_COLORS[index], 0.4);
      scene.tweens.add({
        targets: cardBg,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          onAnswer(index, option.score);
        },
      });
    });
  });

  // Instruction text at bottom
  const instruction = scene.add.text(220, 640, 'Tap the scenario that matches your instinct', {
    fontSize: '12px',
    fontFamily: 'sans-serif',
    color: '#64748b',
    fontStyle: 'italic',
  }).setOrigin(0.5);
  container.add(instruction);
}
