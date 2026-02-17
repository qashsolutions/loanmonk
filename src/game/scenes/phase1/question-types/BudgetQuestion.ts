// ============================================================
// Type 3: Budget Allocation (Slider-based)
// Hypothetical budget with 3-4 categories
// User adjusts sliders to allocate percentage
// Measures: C (planning), O (risk allocation), A (employee welfare)
// ============================================================

import Phaser from 'phaser';
import type { GeneratedQuestion } from '../../../../../lib/types/index.js';

const SLIDER_WIDTH = 320;
const SLIDER_HEIGHT = 8;
const SLIDER_START_X = 60;
const SLIDER_Y_START = 280;
const SLIDER_Y_GAP = 100;
const CATEGORY_COLORS = [0x22c55e, 0x3b82f6, 0xf59e0b, 0xef4444];
const TOTAL_BUDGET = 100;

export function renderBudgetQuestion(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  question: GeneratedQuestion,
  onAnswer: (optionIndex: number, score: number) => void,
): void {
  const options = question.options.slice(0, 4);
  const categoryCount = options.length;

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

  // Budget total display
  const budgetLabel = scene.add.text(220, 195, `Allocate $${TOTAL_BUDGET}K across categories`, {
    fontSize: '13px',
    fontFamily: 'sans-serif',
    color: '#94a3b8',
  }).setOrigin(0.5, 0);
  container.add(budgetLabel);

  // Pie chart center
  const pieX = 220;
  const pieY = 240;
  const pieRadius = 1; // Will be used for a summary circle

  // State: track allocations
  const allocations = new Array(categoryCount).fill(Math.floor(TOTAL_BUDGET / categoryCount));
  // Adjust last to make sum = 100
  allocations[categoryCount - 1] = TOTAL_BUDGET - allocations.slice(0, -1).reduce((a: number, b: number) => a + b, 0);

  const percentTexts: Phaser.GameObjects.Text[] = [];
  const fillBars: Phaser.GameObjects.Rectangle[] = [];
  const handles: Phaser.GameObjects.Arc[] = [];

  // Remaining display
  const remainingText = scene.add.text(220, 230, 'Remaining: 0%', {
    fontSize: '12px',
    fontFamily: 'sans-serif',
    color: '#94a3b8',
  }).setOrigin(0.5);
  container.add(remainingText);

  function updateRemaining() {
    const total = allocations.reduce((a: number, b: number) => a + b, 0);
    const remaining = TOTAL_BUDGET - total;
    remainingText.setText(`Total: ${total}% ${remaining !== 0 ? `(${remaining > 0 ? '+' : ''}${remaining}% remaining)` : '✓'}`);
    remainingText.setColor(remaining === 0 ? '#22c55e' : '#f59e0b');
  }

  // Render sliders for each category
  options.forEach((option, i) => {
    const y = SLIDER_Y_START + i * SLIDER_Y_GAP;

    // Category label
    const catLabel = scene.add.text(SLIDER_START_X, y - 30, option.label, {
      fontSize: '13px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#e2e8f0',
      wordWrap: { width: 200 },
    }).setOrigin(0, 0.5);
    container.add(catLabel);

    // Color dot
    const dot = scene.add.circle(SLIDER_START_X - 16, y - 30, 6, CATEGORY_COLORS[i]);
    container.add(dot);

    // Percentage text
    const pctText = scene.add.text(SLIDER_START_X + SLIDER_WIDTH + 10, y, `${allocations[i]}%`, {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#f1f5f9',
    }).setOrigin(0, 0.5);
    container.add(pctText);
    percentTexts.push(pctText);

    // Slider track
    const track = scene.add.rectangle(SLIDER_START_X + SLIDER_WIDTH / 2, y, SLIDER_WIDTH, SLIDER_HEIGHT, 0x1e293b);
    container.add(track);

    // Slider fill
    const fillWidth = (allocations[i] / TOTAL_BUDGET) * SLIDER_WIDTH;
    const fill = scene.add.rectangle(SLIDER_START_X, y, fillWidth, SLIDER_HEIGHT, CATEGORY_COLORS[i], 0.7);
    fill.setOrigin(0, 0.5);
    container.add(fill);
    fillBars.push(fill);

    // Slider handle
    const handleX = SLIDER_START_X + fillWidth;
    const handle = scene.add.circle(handleX, y, 14, CATEGORY_COLORS[i]);
    handle.setStrokeStyle(3, 0xffffff, 0.8);
    handle.setInteractive({ useHandCursor: true, draggable: true });
    container.add(handle);
    handles.push(handle);

    // Drag behavior
    scene.input.setDraggable(handle);

    handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const clampedX = Phaser.Math.Clamp(dragX, SLIDER_START_X, SLIDER_START_X + SLIDER_WIDTH);
      handle.x = clampedX;

      const percent = Math.round(((clampedX - SLIDER_START_X) / SLIDER_WIDTH) * TOTAL_BUDGET);
      allocations[i] = percent;

      fill.width = clampedX - SLIDER_START_X;
      pctText.setText(`${percent}%`);
      updateRemaining();
    });
  });

  updateRemaining();

  // Confirm button
  const confirmBg = scene.add.rectangle(220, SLIDER_Y_START + categoryCount * SLIDER_Y_GAP + 30, 200, 48, 0x6366f1);
  confirmBg.setInteractive({ useHandCursor: true });
  container.add(confirmBg);

  const confirmText = scene.add.text(220, SLIDER_Y_START + categoryCount * SLIDER_Y_GAP + 30, 'Confirm Allocation', {
    fontSize: '14px',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    color: '#ffffff',
  }).setOrigin(0.5);
  container.add(confirmText);

  confirmBg.on('pointerover', () => confirmBg.setFillStyle(0x818cf8));
  confirmBg.on('pointerout', () => confirmBg.setFillStyle(0x6366f1));

  confirmBg.on('pointerup', () => {
    // Score based on allocation pattern
    // Higher allocation to the first option (usually the "responsible" choice) = higher C score
    // We use the allocation pattern to determine which option's score to use
    const maxAlloc = Math.max(...allocations);
    const dominantIndex = allocations.indexOf(maxAlloc);
    const score = options[dominantIndex].score;

    confirmBg.setFillStyle(0x22c55e);
    scene.tweens.add({
      targets: confirmBg,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 80,
      yoyo: true,
      onComplete: () => onAnswer(dominantIndex, score),
    });
  });

  // Instruction
  const instruction = scene.add.text(220, SLIDER_Y_START + categoryCount * SLIDER_Y_GAP + 75, 'Drag sliders to allocate budget, then confirm', {
    fontSize: '11px',
    fontFamily: 'sans-serif',
    color: '#64748b',
    fontStyle: 'italic',
  }).setOrigin(0.5);
  container.add(instruction);
}
