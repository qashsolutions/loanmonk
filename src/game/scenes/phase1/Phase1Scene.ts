// ============================================================
// Phase1Scene — Main assessment scene with 6 question types
// Manages question flow, progress visualization, behavioral tracking
// ============================================================

import Phaser from 'phaser';
import { api } from '../../config/api.js';
import { renderGridQuestion } from './question-types/GridQuestion.js';
import { renderBarsQuestion } from './question-types/BarsQuestion.js';
import { renderBudgetQuestion } from './question-types/BudgetQuestion.js';
import { renderTimelineQuestion } from './question-types/TimelineQuestion.js';
import { renderReactionQuestion } from './question-types/ReactionQuestion.js';
import { renderTradeoffQuestion } from './question-types/TradeoffQuestion.js';
import type { GeneratedQuestion, QuestionResponse, QuestionType } from '../../../../lib/types/index.js';

interface Phase1Data {
  sessionId: string;
  firstQuestion: GeneratedQuestion;
  progress: number;
  totalEstimated: number;
  userId: string;
}

export class Phase1Scene extends Phaser.Scene {
  private sessionId!: string;
  private userId!: string;
  private currentQuestion!: GeneratedQuestion;
  private questionIndex = 0;
  private progress = 0;
  private totalEstimated = 0;
  private questionStartTime = 0;
  private hesitationCount = 0;
  private lastSelectedOption: number | null = null;

  // UI elements
  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private questionContainer!: Phaser.GameObjects.Container;
  private elapsedSeconds = 0;
  private timerEvent!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'Phase1Scene' });
  }

  init(data: Phase1Data): void {
    this.sessionId = data.sessionId;
    this.userId = data.userId;
    this.currentQuestion = data.firstQuestion;
    this.progress = data.progress;
    this.totalEstimated = data.totalEstimated;
    this.questionIndex = 0;
    this.elapsedSeconds = 0;
  }

  create(): void {
    // Background
    this.add.rectangle(220, 480, 440, 960, 0x0a0e27);

    // Header
    this.add.text(220, 40, 'CreditMind', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#818cf8',
    }).setOrigin(0.5);

    // Timer
    this.timerText = this.add.text(400, 40, '0:00', {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
    }).setOrigin(0.5);

    // Progress bar background
    this.add.rectangle(220, 75, 380, 6, 0x1e293b).setOrigin(0.5);

    // Progress bar fill
    this.progressBar = this.add.rectangle(30, 75, 0, 6, 0x6366f1).setOrigin(0, 0.5);

    // Progress text
    this.progressText = this.add.text(220, 95, '', {
      fontSize: '12px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
    }).setOrigin(0.5);

    // Question container
    this.questionContainer = this.add.container(0, 0);

    // Timer tick
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.elapsedSeconds++;
        const mins = Math.floor(this.elapsedSeconds / 60);
        const secs = this.elapsedSeconds % 60;
        this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
      },
      loop: true,
    });

    // Render first question
    this.showQuestion(this.currentQuestion);
  }

  private showQuestion(question: GeneratedQuestion): void {
    // Clear previous question with fade
    this.questionContainer.removeAll(true);
    this.currentQuestion = question;
    this.questionStartTime = Date.now();
    this.hesitationCount = 0;
    this.lastSelectedOption = null;

    // Update progress
    const progressWidth = (this.progress / this.totalEstimated) * 380;
    this.tweens.add({
      targets: this.progressBar,
      width: progressWidth,
      duration: 300,
      ease: 'Cubic.easeOut',
    });
    this.progressText.setText(`Question ${this.progress} of ~${this.totalEstimated}`);

    // Render question by type
    const onAnswer = (optionIndex: number, score: number) => {
      this.handleAnswer(optionIndex, score);
    };

    const renderers: Record<QuestionType, (scene: Phaser.Scene, container: Phaser.GameObjects.Container, q: GeneratedQuestion, cb: (idx: number, score: number) => void) => void> = {
      grid: renderGridQuestion,
      bars: renderBarsQuestion,
      budget: renderBudgetQuestion,
      timeline: renderTimelineQuestion,
      reaction: renderReactionQuestion,
      tradeoff: renderTradeoffQuestion,
    };

    const renderer = renderers[question.question_type];
    if (renderer) {
      renderer(this, this.questionContainer, question, onAnswer);
    } else {
      // Fallback to grid for unknown types
      renderGridQuestion(this, this.questionContainer, question, onAnswer);
    }

    // Fade in
    this.questionContainer.setAlpha(0);
    this.tweens.add({
      targets: this.questionContainer,
      alpha: 1,
      duration: 300,
      ease: 'Cubic.easeOut',
    });
  }

  private async handleAnswer(optionIndex: number, score: number): Promise<void> {
    const responseTimeMs = Date.now() - this.questionStartTime;
    const changedAnswer = this.lastSelectedOption !== null && this.lastSelectedOption !== optionIndex;
    if (this.lastSelectedOption !== null && this.lastSelectedOption !== optionIndex) {
      this.hesitationCount++;
    }
    this.lastSelectedOption = optionIndex;

    // Visual feedback — color pulse
    this.cameras.main.flash(100, 99, 102, 241, true);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }

    // Build response
    const response: QuestionResponse = {
      session_id: this.sessionId,
      question_index: this.questionIndex,
      question_type: this.currentQuestion.question_type,
      trait: this.currentQuestion.trait,
      score,
      response_time_ms: responseTimeMs,
      raw_response: {
        option_index: optionIndex,
        option_label: this.currentQuestion.options[optionIndex]?.label,
      },
      hesitation_count: this.hesitationCount,
      changed_answer: changedAnswer,
    };

    // Show loading state
    const loadingText = this.add.text(220, 500, 'Loading next...', {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
    }).setOrigin(0.5).setDepth(100);

    try {
      const result = await api.nextQuestion({
        session_id: this.sessionId,
        response,
      });

      loadingText.destroy();
      this.questionIndex++;

      if (result.phase1_complete || !result.question) {
        // Phase 1 complete — compute Phase 1 score then go to Phase 2
        await this.completePhase1();
      } else {
        this.progress = result.progress;
        this.totalEstimated = result.total_estimated;
        this.showQuestion(result.question);
      }
    } catch (error) {
      loadingText.setText('Connection error. Tap to retry.');
      loadingText.setInteractive({ useHandCursor: true });
      loadingText.on('pointerup', () => {
        loadingText.destroy();
        this.handleAnswer(optionIndex, score);
      });
    }
  }

  private async completePhase1(): Promise<void> {
    // Show transition screen
    this.questionContainer.removeAll(true);

    const completeText = this.add.text(220, 400, 'Great job!', {
      fontSize: '28px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5);

    const subText = this.add.text(220, 440, 'Phase 1 complete. Calculating...', {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
    }).setOrigin(0.5);

    try {
      // Compute Phase 1 PD score server-side
      await api.completePhase1({ session_id: this.sessionId });

      subText.setText('Now for a quick mini-game...');

      // Brief pause then transition to Phase 2
      this.time.delayedCall(1500, () => {
        this.timerEvent.destroy();
        this.scene.start('SupplyRunScene', {
          sessionId: this.sessionId,
          userId: this.userId,
        });
      });
    } catch (error) {
      subText.setText('Error. Tap to continue.');
      subText.setInteractive({ useHandCursor: true });
      subText.on('pointerup', () => {
        // Skip to result if Phase 1 scoring fails
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
