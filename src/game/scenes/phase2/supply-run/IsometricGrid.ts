// ============================================================
// Isometric Grid Renderer
// Handles tile-based isometric 2.5D rendering
// Manages zone highlighting and path visualization
// ============================================================

import Phaser from 'phaser';

interface Zone {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}

export class IsometricGrid {
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private tileSize: number;
  private offsetX: number;
  private offsetY: number;
  private zones: Zone[] = [];
  private tileGraphics!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, width: number, height: number, tileSize: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    // Center the grid in the game area (below HUD)
    this.offsetX = 220;
    this.offsetY = 120;
  }

  /**
   * Convert grid coordinates to isometric screen position.
   */
  toIsometric(gridX: number, gridY: number): { x: number; y: number } {
    const isoX = (gridX - gridY) * (this.tileSize * 0.5) + this.offsetX;
    const isoY = (gridX + gridY) * (this.tileSize * 0.25) + this.offsetY;
    return { x: isoX, y: isoY };
  }

  /**
   * Convert screen position to grid coordinates.
   */
  fromIsometric(screenX: number, screenY: number): { x: number; y: number } {
    const adjustedX = screenX - this.offsetX;
    const adjustedY = screenY - this.offsetY;

    const gridX = (adjustedX / (this.tileSize * 0.5) + adjustedY / (this.tileSize * 0.25)) / 2;
    const gridY = (adjustedY / (this.tileSize * 0.25) - adjustedX / (this.tileSize * 0.5)) / 2;

    return { x: Math.round(gridX), y: Math.round(gridY) };
  }

  /**
   * Render the full isometric grid with zone coloring.
   */
  render(): void {
    this.tileGraphics = this.scene.add.graphics();

    // Draw tiles
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const zone = this.getZoneAt(x, y);
        const color = zone ? zone.color : 0x1a1f3a;
        const alpha = zone ? 0.3 : 0.15;
        this.drawTile(x, y, color, alpha);
      }
    }

    // Draw grid lines
    this.tileGraphics.lineStyle(1, 0x334155, 0.2);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.drawTileOutline(x, y);
      }
    }
  }

  /**
   * Mark a rectangular zone on the grid.
   */
  markZone(name: string, x: number, y: number, w: number, h: number, color: number): void {
    this.zones.push({ name, x, y, w, h, color });
  }

  /**
   * Get the zone at a specific grid position, if any.
   */
  getZoneAt(x: number, y: number): Zone | null {
    for (const zone of this.zones) {
      if (x >= zone.x && x < zone.x + zone.w && y >= zone.y && y < zone.y + zone.h) {
        return zone;
      }
    }
    return null;
  }

  /**
   * Check if a grid position is within the map bounds.
   */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private drawTile(gridX: number, gridY: number, color: number, alpha: number): void {
    const pos = this.toIsometric(gridX, gridY);
    const hw = this.tileSize * 0.5;
    const hh = this.tileSize * 0.25;

    this.tileGraphics.fillStyle(color, alpha);
    this.tileGraphics.beginPath();
    this.tileGraphics.moveTo(pos.x, pos.y - hh);      // top
    this.tileGraphics.lineTo(pos.x + hw, pos.y);       // right
    this.tileGraphics.lineTo(pos.x, pos.y + hh);       // bottom
    this.tileGraphics.lineTo(pos.x - hw, pos.y);       // left
    this.tileGraphics.closePath();
    this.tileGraphics.fillPath();
  }

  private drawTileOutline(gridX: number, gridY: number): void {
    const pos = this.toIsometric(gridX, gridY);
    const hw = this.tileSize * 0.5;
    const hh = this.tileSize * 0.25;

    this.tileGraphics.beginPath();
    this.tileGraphics.moveTo(pos.x, pos.y - hh);
    this.tileGraphics.lineTo(pos.x + hw, pos.y);
    this.tileGraphics.lineTo(pos.x, pos.y + hh);
    this.tileGraphics.lineTo(pos.x - hw, pos.y);
    this.tileGraphics.closePath();
    this.tileGraphics.strokePath();
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }
  getTileSize(): number { return this.tileSize; }
}
