// ============================================================
// CreditMind Game Entry Point
// Initializes Phaser and manages the game lifecycle
// ============================================================

import Phaser from 'phaser';
import { BootScene } from './scenes/common/BootScene.js';
import { Phase1Scene } from './scenes/phase1/Phase1Scene.js';
import { SupplyRunScene } from './scenes/phase2/supply-run/SupplyRunScene.js';
import { ResultScene } from './scenes/common/ResultScene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-game',
  width: 440,
  height: 960,
  backgroundColor: '#0a0e27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, Phase1Scene, SupplyRunScene, ResultScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    activePointers: 3,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
};

// Wait for DOM then launch
window.addEventListener('DOMContentLoaded', () => {
  const game = new Phaser.Game(config);

  // Expose for debugging
  (window as unknown as Record<string, unknown>).__CREDITMIND_GAME = game;
});
