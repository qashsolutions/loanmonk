// ============================================================
// Type 6: Trade-Off Dilemma (Binary Choice)
// Two options with clear trade-offs, neither obviously "right"
// Split-screen with contrasting illustrations
// Measures: A (self vs others), O (risk vs safety), E (solo vs group)
// ============================================================

import Phaser from 'phaser';
import type { GeneratedQuestion } from '../../../../../lib/types/index.js';

const LEFT_COLOR = 0x3b82f6;  // Blue
const RIGHT_COLOR = 0xf59e0b; // Amber
const PANEL_WIDTH = 200;
const PANEL_HEIGHT = 360;

export function renderTradeoffQuestion(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  question: GeneratedQuestion,
  onAnswer: (optionIndex: number, score: number) => void,
): void {
  const options = question.options.slice(0, 2);

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

  // "OR" divider
  const dividerLine = scene.add.rectangle(220, 420, 2, 300, 0x334155);
  container.add(dividerLine);

  const orCircle = scene.add.circle(220, 420, 20, 0x0a0e27);
  orCircle.setStrokeStyle(2, 0x334155);
  container.add(orCircle);

  const orText = scene.add.text(220, 420, 'OR', {
    fontSize: '12px',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    color: '#64748b',
  }).setOrigin(0.5);
  container.add(orText);

  // Render two panels
  const panels = [
    { x: 110, color: LEFT_COLOR },
    { x: 330, color: RIGHT_COLOR },
  ];

  options.forEach((option, i) => {
    const panel = panels[i];
    const panelY = 380;

    // Panel background
    const bg = scene.add.rectangle(panel.x, panelY, PANEL_WIDTH, PANEL_HEIGHT, 0x1e2952, 0.6);
    bg.setStrokeStyle(2, panel.color, 0.4);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // Color accent bar at top
    const accentBar = scene.add.rectangle(panel.x, panelY - PANEL_HEIGHT / 2 + 4, PANEL_WIDTH - 4, 8, panel.color, 0.7);
    container.add(accentBar);

    // Large icon area
    const iconBg = scene.add.circle(panel.x, panelY - 80, 36, panel.color, 0.2);
    iconBg.setStrokeStyle(2, panel.color, 0.5);
    container.add(iconBg);

    // Option letter
    const letter = scene.add.text(panel.x, panelY - 80, i === 0 ? 'A' : 'B', {
      fontSize: '28px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(letter);

    // Option label
    const label = scene.add.text(panel.x, panelY - 10, option.label, {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#f1f5f9',
      wordWrap: { width: PANEL_WIDTH - 30 },
      align: 'center',
    }).setOrigin(0.5, 0);
    container.add(label);

    // Visual hint / outcome description
    if (option.visual_hint) {
      const outcomeText = scene.add.text(panel.x, panelY + 50, option.visual_hint, {
        fontSize: '11px',
        fontFamily: 'sans-serif',
        color: '#94a3b8',
        wordWrap: { width: PANEL_WIDTH - 30 },
        align: 'center',
      }).setOrigin(0.5, 0);
      container.add(outcomeText);
    }

    // "Choose" indicator at bottom of panel
    const chooseText = scene.add.text(panel.x, panelY + PANEL_HEIGHT / 2 - 25, 'TAP TO CHOOSE', {
      fontSize: '10px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: panel.color === LEFT_COLOR ? '#60a5fa' : '#fbbf24',
      letterSpacing: 2,
    }).setOrigin(0.5);
    container.add(chooseText);

    // Hover effect
    bg.on('pointerover', () => {
      bg.setStrokeStyle(3, panel.color, 0.8);
      scene.tweens.add({ targets: bg, scaleX: 1.02, scaleY: 1.02, duration: 100 });
    });

    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, panel.color, 0.4);
      scene.tweens.add({ targets: bg, scaleX: 1, scaleY: 1, duration: 100 });
    });

    // Selection
    bg.on('pointerup', () => {
      // Highlight selected, dim other
      bg.setFillStyle(panel.color, 0.4);
      const otherPanel = panels[1 - i];
      const otherBg = container.getAt(container.list.indexOf(bg) + (i === 0 ? 8 : -8)); // approximate

      scene.tweens.add({
        targets: bg,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        yoyo: true,
        onComplete: () => {
          onAnswer(i, option.score);
        },
      });
    });
  });

  // Instruction at bottom
  const instruction = scene.add.text(220, 590, 'Which would you choose? There is no wrong answer.', {
    fontSize: '11px',
    fontFamily: 'sans-serif',
    color: '#64748b',
    fontStyle: 'italic',
    wordWrap: { width: 380 },
    align: 'center',
  }).setOrigin(0.5);
  container.add(instruction);
}
