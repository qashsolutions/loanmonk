// ============================================================
// Type 4: Timeline Sequencing (Drag to Reorder)
// 4-5 business tasks that need ordering by priority
// User drags to reorder
// Measures: C (organization), N (urgency bias)
// ============================================================

import Phaser from 'phaser';
import type { GeneratedQuestion } from '../../../../../lib/types/index.js';

const TASK_HEIGHT = 64;
const TASK_WIDTH = 360;
const TASK_GAP = 10;
const TASK_START_X = 220;
const TASK_START_Y = 260;
const TASK_COLORS = [0x6366f1, 0x8b5cf6, 0xa855f7, 0xd946ef, 0xec4899];

interface DraggableTask {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  index: number;
  originalIndex: number;
  score: number;
}

export function renderTimelineQuestion(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  question: GeneratedQuestion,
  onAnswer: (optionIndex: number, score: number) => void,
): void {
  const options = question.options.slice(0, 5);

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

  // Sub-instruction
  const subText = scene.add.text(220, 185, 'Drag tasks to reorder by priority (most important first)', {
    fontSize: '12px',
    fontFamily: 'sans-serif',
    color: '#94a3b8',
    wordWrap: { width: 380 },
    align: 'center',
  }).setOrigin(0.5, 0);
  container.add(subText);

  // Priority labels
  const topLabel = scene.add.text(40, TASK_START_Y - 20, 'Highest Priority', {
    fontSize: '10px', fontFamily: 'sans-serif', color: '#22c55e',
  });
  container.add(topLabel);

  const bottomLabel = scene.add.text(40, TASK_START_Y + options.length * (TASK_HEIGHT + TASK_GAP) - 10, 'Lowest Priority', {
    fontSize: '10px', fontFamily: 'sans-serif', color: '#ef4444',
  });
  container.add(bottomLabel);

  // Create draggable task cards
  const tasks: DraggableTask[] = [];
  const taskOrder: number[] = options.map((_, i) => i);

  function getSlotY(slotIndex: number): number {
    return TASK_START_Y + slotIndex * (TASK_HEIGHT + TASK_GAP);
  }

  options.forEach((option, index) => {
    const y = getSlotY(index);

    const taskContainer = scene.add.container(TASK_START_X, y);

    // Card background
    const bg = scene.add.rectangle(0, 0, TASK_WIDTH, TASK_HEIGHT, 0x1e2952, 0.8);
    bg.setStrokeStyle(2, TASK_COLORS[index], 0.5);
    bg.setInteractive({ useHandCursor: true, draggable: true });
    taskContainer.add(bg);

    // Priority number
    const numCircle = scene.add.circle(-TASK_WIDTH / 2 + 28, 0, 16, TASK_COLORS[index], 0.4);
    taskContainer.add(numCircle);

    const numText = scene.add.text(-TASK_WIDTH / 2 + 28, 0, String(index + 1), {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    taskContainer.add(numText);

    // Task label
    const label = scene.add.text(-TASK_WIDTH / 2 + 56, 0, option.label, {
      fontSize: '13px',
      fontFamily: 'sans-serif',
      color: '#e2e8f0',
      wordWrap: { width: TASK_WIDTH - 100 },
    }).setOrigin(0, 0.5);
    taskContainer.add(label);

    // Drag handle indicator
    const grip = scene.add.text(TASK_WIDTH / 2 - 20, 0, '≡', {
      fontSize: '20px',
      fontFamily: 'sans-serif',
      color: '#64748b',
    }).setOrigin(0.5);
    taskContainer.add(grip);

    container.add(taskContainer);

    const task: DraggableTask = {
      container: taskContainer,
      bg,
      index,
      originalIndex: index,
      score: option.score,
    };
    tasks.push(task);

    // Drag behavior
    scene.input.setDraggable(bg);

    bg.on('dragstart', () => {
      taskContainer.setDepth(100);
      bg.setFillStyle(TASK_COLORS[index], 0.5);
    });

    bg.on('drag', (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
      taskContainer.y = dragY;

      // Determine new slot position
      const currentSlot = taskOrder.indexOf(index);
      const nearestSlot = Math.round((dragY - TASK_START_Y) / (TASK_HEIGHT + TASK_GAP));
      const clampedSlot = Phaser.Math.Clamp(nearestSlot, 0, options.length - 1);

      if (clampedSlot !== currentSlot) {
        // Swap positions in order
        taskOrder.splice(currentSlot, 1);
        taskOrder.splice(clampedSlot, 0, index);

        // Animate other cards to new positions
        taskOrder.forEach((taskIdx, slotIdx) => {
          if (taskIdx !== index) {
            scene.tweens.add({
              targets: tasks[taskIdx].container,
              y: getSlotY(slotIdx),
              duration: 150,
              ease: 'Cubic.easeOut',
            });
          }
        });
      }
    });

    bg.on('dragend', () => {
      taskContainer.setDepth(0);
      bg.setFillStyle(0x1e2952, 0.8);

      const finalSlot = taskOrder.indexOf(index);
      scene.tweens.add({
        targets: taskContainer,
        y: getSlotY(finalSlot),
        duration: 150,
        ease: 'Cubic.easeOut',
      });

      // Update number labels
      taskOrder.forEach((taskIdx, slotIdx) => {
        const taskItem = tasks[taskIdx];
        const numChild = taskItem.container.getAt(2) as Phaser.GameObjects.Text;
        numChild.setText(String(slotIdx + 1));
      });
    });
  });

  // Confirm button
  const confirmY = TASK_START_Y + options.length * (TASK_HEIGHT + TASK_GAP) + 30;
  const confirmBg = scene.add.rectangle(220, confirmY, 200, 48, 0x6366f1);
  confirmBg.setInteractive({ useHandCursor: true });
  container.add(confirmBg);

  const confirmLabel = scene.add.text(220, confirmY, 'Confirm Order', {
    fontSize: '14px',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    color: '#ffffff',
  }).setOrigin(0.5);
  container.add(confirmLabel);

  confirmBg.on('pointerup', () => {
    // Score based on which task is placed first (highest priority)
    const topTaskIndex = taskOrder[0];
    const score = options[topTaskIndex].score;

    confirmBg.setFillStyle(0x22c55e);
    scene.time.delayedCall(200, () => onAnswer(topTaskIndex, score));
  });
}
