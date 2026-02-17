// ============================================================
// Player Controller for Supply Run
// Handles movement on isometric grid via tap/click
// ============================================================

import Phaser from 'phaser';
import { IsometricGrid } from './IsometricGrid.js';

export class Player {
  private scene: Phaser.Scene;
  private grid: IsometricGrid;
  private gridX: number;
  private gridY: number;
  private sprite: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Rectangle;
  private cargoVisual: Phaser.GameObjects.Rectangle[];
  private isMoving = false;

  constructor(scene: Phaser.Scene, grid: IsometricGrid, startX: number, startY: number) {
    this.scene = scene;
    this.grid = grid;
    this.gridX = startX;
    this.gridY = startY;
    this.cargoVisual = [];

    // Create player sprite (simple cart/van)
    const pos = grid.toIsometric(startX, startY);
    this.sprite = scene.add.container(pos.x, pos.y - 10);

    // Van body
    this.body = scene.add.rectangle(0, 0, 20, 14, 0x6366f1);
    this.body.setStrokeStyle(1, 0x818cf8);
    this.sprite.add(this.body);

    // Wheels
    const wheelL = scene.add.circle(-8, 8, 3, 0x334155);
    const wheelR = scene.add.circle(8, 8, 3, 0x334155);
    this.sprite.add(wheelL);
    this.sprite.add(wheelR);

    // Direction indicator
    const arrow = scene.add.triangle(0, -12, 0, -6, -4, 0, 4, 0, 0xffffff, 0.6);
    this.sprite.add(arrow);

    this.sprite.setDepth(50);

    // Handle tap-to-move input
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isMoving) return;
      const target = grid.fromIsometric(pointer.worldX, pointer.worldY);
      if (grid.isInBounds(target.x, target.y)) {
        this.moveTo(target.x, target.y);
      }
    });
  }

  /**
   * Move the player to a target grid position with animation.
   */
  moveTo(targetX: number, targetY: number): void {
    if (this.isMoving) return;
    if (targetX === this.gridX && targetY === this.gridY) return;
    if (!this.grid.isInBounds(targetX, targetY)) return;

    this.isMoving = true;

    // Simple direct movement (not pathfinding for 60-second game)
    const targetPos = this.grid.toIsometric(targetX, targetY);

    this.scene.tweens.add({
      targets: this.sprite,
      x: targetPos.x,
      y: targetPos.y - 10,
      duration: 300 + Math.abs(targetX - this.gridX + targetY - this.gridY) * 50,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.gridX = targetX;
        this.gridY = targetY;
        this.isMoving = false;
      },
    });
  }

  /**
   * Update cargo visual (stacked crates on the van).
   */
  updateCargoVisual(crateCount: number): void {
    // Remove existing cargo visuals
    for (const crate of this.cargoVisual) {
      crate.destroy();
    }
    this.cargoVisual = [];

    // Stack crates on top of van
    for (let i = 0; i < crateCount; i++) {
      const crate = this.scene.add.rectangle(0, -18 - i * 6, 12, 6, 0x8b5cf6);
      crate.setStrokeStyle(1, 0xa78bfa);
      this.sprite.add(crate);
      this.cargoVisual.push(crate);
    }

    // Wobble animation if overloaded
    if (crateCount >= 4) {
      this.scene.tweens.add({
        targets: this.sprite,
        angle: { from: -2, to: 2 },
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.sprite.setAngle(0);
    }
  }

  getGridX(): number { return this.gridX; }
  getGridY(): number { return this.gridY; }
  getIsMoving(): boolean { return this.isMoving; }
}
