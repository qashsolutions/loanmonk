// ============================================================
// Type 5: Reaction Speed Scenario
// A scenario flashes for 3 seconds, two buttons appear
// Time-to-tap is measured
// Measures: N (anxiety = faster/impulsive), C (deliberation = measured)
// ============================================================

import Phaser from 'phaser';
import type { GeneratedQuestion } from '../../../../../lib/types/index.js';

const FLASH_DURATION = 3000; // 3 seconds scenario display
const BUTTON_APPEAR_DELAY = 3000; // Buttons appear after scenario

export function renderReactionQuestion(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  question: GeneratedQuestion,
  onAnswer: (optionIndex: number, score: number) => void,
): void {
  const options = question.options.slice(0, 2);

  // Full-screen scenario flash
  const scenarioBg = scene.add.rectangle(220, 400, 400, 400, 0x1e2952, 0.9);
  scenarioBg.setStrokeStyle(2, 0x6366f1, 0.5);
  container.add(scenarioBg);

  // Scenario icon (large)
  const scenarioIcon = scene.add.text(220, 300, '⚡', {
    fontSize: '64px',
    fontFamily: 'sans-serif',
  }).setOrigin(0.5);
  container.add(scenarioIcon);

  // Scenario text
  const scenarioText = scene.add.text(220, 390, question.text_clue, {
    fontSize: '20px',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    color: '#f1f5f9',
    wordWrap: { width: 340 },
    align: 'center',
  }).setOrigin(0.5);
  container.add(scenarioText);

  // Visual description as context
  const contextText = scene.add.text(220, 450, question.visual_description.slice(0, 120), {
    fontSize: '12px',
    fontFamily: 'sans-serif',
    color: '#94a3b8',
    wordWrap: { width: 340 },
    align: 'center',
  }).setOrigin(0.5, 0);
  container.add(contextText);

  // Countdown timer (3-2-1)
  const countdownText = scene.add.text(220, 530, '3', {
    fontSize: '32px',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    color: '#f59e0b',
  }).setOrigin(0.5);
  container.add(countdownText);

  // "Read the scenario" instruction
  const readText = scene.add.text(220, 570, 'Read the scenario carefully...', {
    fontSize: '12px',
    fontFamily: 'sans-serif',
    color: '#64748b',
    fontStyle: 'italic',
  }).setOrigin(0.5);
  container.add(readText);

  // Countdown animation
  let countdown = 3;
  const countdownTimer = scene.time.addEvent({
    delay: 1000,
    callback: () => {
      countdown--;
      if (countdown > 0) {
        countdownText.setText(String(countdown));
        scene.tweens.add({
          targets: countdownText,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 150,
          yoyo: true,
        });
      } else {
        countdownText.setText('REACT!');
        countdownText.setColor('#ef4444');
        scene.tweens.add({
          targets: countdownText,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 200,
          yoyo: true,
        });
      }
    },
    repeat: 2,
  });

  // After countdown, show buttons and measure reaction time
  scene.time.delayedCall(BUTTON_APPEAR_DELAY, () => {
    readText.setText('Choose quickly!');
    readText.setColor('#ef4444');

    const buttonAppearTime = Date.now();

    // Two reaction buttons side by side
    options.forEach((option, i) => {
      const btnX = i === 0 ? 120 : 320;
      const btnColor = i === 0 ? 0x3b82f6 : 0xf59e0b;
      const btnY = 650;

      const btnBg = scene.add.rectangle(btnX, btnY, 160, 80, btnColor, 0.8);
      btnBg.setStrokeStyle(2, 0xffffff, 0.5);
      btnBg.setInteractive({ useHandCursor: true });
      container.add(btnBg);

      const btnLabel = scene.add.text(btnX, btnY, option.label, {
        fontSize: '13px',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        wordWrap: { width: 140 },
        align: 'center',
      }).setOrigin(0.5);
      container.add(btnLabel);

      // Pulse animation to draw attention
      scene.tweens.add({
        targets: btnBg,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Fade in
      btnBg.setAlpha(0);
      btnLabel.setAlpha(0);
      scene.tweens.add({
        targets: [btnBg, btnLabel],
        alpha: 1,
        duration: 200,
      });

      btnBg.on('pointerup', () => {
        const reactionTime = Date.now() - buttonAppearTime;

        // Score is a combination of the option's score and reaction time
        // Faster reaction on "impulsive" options raises N score
        // Deliberate reaction on "measured" options raises C score
        let adjustedScore = option.score;

        // Modify based on reaction speed
        // Very fast (<500ms) = impulsive signal
        // Moderate (500-2000ms) = deliberate signal
        // Very slow (>3000ms) = indecisive signal
        if (reactionTime < 500) {
          adjustedScore = Math.min(5, adjustedScore + 0.5); // Boosts raw score (impulsive)
        } else if (reactionTime > 3000) {
          adjustedScore = Math.max(1, adjustedScore - 0.3); // Slight penalty for indecision
        }

        btnBg.setFillStyle(0x22c55e);
        scene.time.delayedCall(200, () => onAnswer(i, adjustedScore));
      });
    });
  });
}
